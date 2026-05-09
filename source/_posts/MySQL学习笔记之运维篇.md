---
title: MySQL学习笔记之运维篇
date: 2026-03-28 12:00:00
categories:
  - MySQL
tags:
  - MySQL
cover: /img/mysql-cover.jpg
---

### 日志

#### 1. 错误日志

(1) 错误日志是 MySQL 中最重要的日志之一，它记录了当 mysqld 启动和停止时，以及服务器在运行过程中发生任何严重错误时的相关信息当数据库出现任何故障导致无法正常使用时，建议首先查看此日志。

(2) 该日志是默认开启的，默认存放目录 /var/log/，默认的日志文件名为 mysqld.log 。查看日志位置：

```bash
show variables like '%log_error%'
```

#### 2. 二进制日志

(1) 二进制日志(BINLOG)记录了所有的 DDL(数据定义语言)语句和 DML(数据操纵语言)语句，但不包括数据查询(SELECT、SHOW)语句。

(2) 作用：

① 灾难时的数据恢复；

② MySQL的主从复制。

在MySQL8版本中，默认二进制日志是开启着的，涉及到的参数如下：

```bash
show variables like '%log_bin%'
```

(3) 日志格式

MySQL服务器中提供了多种格式来记录二进制记录，具体格式及特点如下：

| 日志格式  | 含义                                                         |
| --------- | ------------------------------------------------------------ |
| statement | 基于SQL语句的日志记录，记录的是SQL语句，对数据进行修改的SQL都会记录在日志文件中。 |
| row       | 基于行的日志记录，记录的是每一行的数据变更。(默认)           |
| mixed     | 混合了STATEMENT和ROW两种格式，默认采用STATEMENT，在某些特殊情况下会自动切换为ROW进行记录。 |

查看参数方式：

```bash
show variables like '%binlog_format%';
```

(4) 日志查看

由于日志是以二进制方式存储的，不能直接读取，需要通过二进制日志查询工具 mysqlbinlog 来查看，具体语法：

```bash
mysqlbinlog[参数选项]logfilename

参数选项：
    -d    指定数据库名称，只列出指定的数据库相关的操作。
    -o    忽略掉日志中的前n行命令。
    -v    将行事件(数据变更)重构为SOL语句。
    -vv    将行事件(数据变更)重构为SQL语句，并输出注释信息
```

(5) 日志删除

对于比较繁忙的业务系统，每天生成的binlog数据巨大，如果长时间不清除，将会占用大量磁盘空间。可以通过以下几种方式清理日志：

| 指令                                             | 含义                                                         |
| ------------------------------------------------ | ------------------------------------------------------------ |
| reset master                                     | 删除全部 binlog 日志，删除之后，日志编号，将从 binlog.000001重新开始 |
| purge master logs to ‘binlog.***’                | 删除 *** 编号之前的所有日志                                  |
| purge master logs before ‘yyyy-mm-dd hh24:mi:ss’ | 删除日志为”yyyy-mm-dd hh24:mi:ss”之前产生的所有日志          |

也可以在mysql的配置文件中配置二进制日志的过期时间，设置了之后，二进制日志过期会自动删除。

```bash
show variables like '%binlog_expire_logs_seconds%'
```

#### 3. 查询日志

(1) 查询日志中记录了客户端的所有操作语句，而二进制日志不包含查询数据的SQL语句。默认情况下，查询日志是未开启的。如果需要开启查询日志，可以设置一下配置：

修改MySQL的配置文件 /etc/my.cnf 文件，添加如下内容：

```bash
#该选项用来开启查询日志，可选值：0或者1；0代表关闭，1代表开启
general_log=1
#设置日志的文件名 ， 如果没有指定，默认的文件名为 host_name.log
general_log_file=mysql_query.log
```

#### 4. 慢查询日志

(1) 慢查询日志记录了所有执行时间超过参数 long_query_time 设置值并且扫描记录数不小于 min_examined_row_limit的所有的SQL语句的日志，默认未开启。long_query_time 默认为 10 秒，最小为0，精度可以到微秒。

```bash
#慢查询日志
slow_query_log=1
#执行时间参数
long_query_time=2
```

(2) 默认情况下，不会记录管理语句，也不会记录不使用索引进行查找的查询。可以使用log_slow_admin_statements和更改此行为log_queries_not_using_indexes，如下所述。

```bash
#记录执行较慢的管理语句
log_slow_admin_statements = 1
#记录执行较慢的未使用索引的语句
log_queries_not_using_indexes = 1
```

### 主从复制

#### 1. 概述

(1) 主从复制是指将主数据库的 DDL 和 DML 操作通过二进制日志传到从库服务器中，然后在从库上对这些日志重新执行（也叫做重做），从而使得从库和主库的数据保持同步。

(2) MySQL 支持一台主库同时向多台从库进行复制，从库同时也可以作为其他服务器的主库，实现链式复制。

(3) MySQL 复制的优点主要包含以下三个方面：

① 主库出现问题，可以快速切换到从库提供服务。

② 实现读写分离，降低主库的访问压力。

③ 可以在从库中执行备份，以避免备份期间影响主服务器。

#### 2. 原理

<img src="https://i-blog.csdnimg.cn/direct/1995691d74904bae8145f9d4e7e8aec7.png" alt="img" style="zoom:67%;" />

从上图来看，复制分成三步：

(1) Master 主库在事务提交时，会把数据变更记录在二进制日志文件 Binlog 中。

(2) 从库读取主库的二进制日志文件 Binlog，写入到从库的中继日志 Relay log。

(3) slave 重做中继日志中的事件，将改变反映它自己的数据。

#### 3. 搭建

![img](https://i-blog.csdnimg.cn/direct/b49db5a2f7ca48a48d48800da7b37344.png)

#### 4. 主库配置

(1) 修改配置文件 /etc/my.cnf

```bash
#mysql 服务ID，保证整个集群环境中唯一，取值范围：1 - 2^32-1，默认为1
server-id=1
#是否只读 1代表只读，0代表读写
read-only=0
#忽略的数据库，指不需要同步的数据库
#binlog-ignore-db=mysql
#指定同步的数据库
#binlog-do-db=db01
```

(2) 重启 MySQL 服务器

```bash
systemctl restart mysqld
```

(3) 登录 mysql，创建远程连接的账号，并授予主从复制权限

```bash
#创建itcast用户，并设置密码，该用户可在任意主机连接该MySQL服务
CREATE USER 'itcast'@'%' IDENTIFIED WITH mysql_native_password BY 'Root@123456';
#为'itcast'@'%'用户分配主从复制权限
GRANT REPLICATION SLAVE ON *.* TO 'itcast'@'%';
```

(4) 通过指令，查看二进制日志坐标

```bash
show master status;
```

字段含义说明：

file：从哪个日志文件开始推送日志文件

position：从哪个位置开始推送日志

binlog_ignore_db：指定不需要同步的数据库

#### 5. 从库配置

(1) 修改配置文件 /etc/my.cnf

```bash
#mysql服务ID，保证整个集群环境中唯一，取值范围：1 - 2^32-1，和主库不一样即可
server-id=2
#是否只读：1代表只读，0代表读写
read-only=1
```

(2) 重新启动 MySQL 服务

```bash
systemctl restart mysqld
```

(3) 登录 mysql，设置主库配置

```bash
CHANGE REPLICATION SOURCE TO SOURCE_HOST='xxx', SOURCE_USER='xxx', SOURCE_PASSWORD='xxx', SOURCE_LOG_FILE='xxx', SOURCE_LOG_POS=xxx;
```

上述是 8.0.23 中的语法。如果 mysql 是 8.0.23 之前的版本，执行如下 SQL：

```bash
CHANGE MASTER TO MASTER_HOST='xxx.xxx.xxx.xxx', MASTER_USER='xxx', MASTER_PASSWORD='xxx', MASTER_LOG_FILE='xxx', MASTER_LOG_POS=xxx;
```

| 参数名          | 含义                | 8.0.23 之前     |
| --------------- | ------------------- | --------------- |
| SOURCE_HOST     | 主库 IP 地址        | MASTER_HOST     |
| SOURCE_USER     | 连接主库的用户名    | MASTER_USER     |
| SOURCE_PASSWORD | 连接主库的密码      | MASTER_PASSWORD |
| SOURCE_LOG_FILE | binlog 日志文件名   | MASTER_LOG_FILE |
| SOURCE_LOG_POS  | binlog 日志文件位置 | MASTER_LOG_POS  |

(4) 开启同步操作

```bash
start replica ;  #8.0.22之后
start slave ;    #8.0.22之前
```

(5) 查看主从同步状态

```bash
show replica status ;  #8.0.22之后
show slave status ;    #8.0.22之前
```

#### 6. 测试

(1) 在主库上创建数据库、表，并插入数据

```sql
create database db01;
use db01;
create table tb_use(
	id int(11) primary key not null auto_increment,
	name varchar(50) not null,
	sex varchar(1)
)engine=innodb default charset=utf8mb4;
insert into tb_user(id, name, sex) valurs (null, 'Tom', '1'), (null, 'Trigger', '0'), (null, 'Dawn', '1');
```

(2) 在从库中查询数据，验证主从是否同步。

### 分库分表

#### 1. 介绍

(1) 问题分析

随着互联网及移动互联网的发展，应用系统的数据量也是成指数式增长，若采用单数据库进行数据存储，存在以下性能瓶颈：

① I/O 瓶颈：热点数据太多，数据库缓存不足，产生大量磁盘 I/O，效率较低。请求数据太多，带宽不够，网络 I/O 瓶颈。

② CPU 瓶颈：排序、分组、连接查询、聚合统计等 SQL 会耗费大量的 CPU 资源，请求数太多，CPU 出现瓶颈。

分库分表的中心思想都是将数据分散存储，使得单一数据库 / 表的数据量变小来缓解单一数据库的性能问题，从而达到提升数据库性能的目的。

(2) 拆分策略

![img](https://i-blog.csdnimg.cn/direct/51c6a3212fee45cc888ff4556108a4cf.png)

(3) 垂直拆分

① 垂直分库

<img src="https://i-blog.csdnimg.cn/direct/f4562b894ab843c0b4093156e5be8268.png" alt="img" style="zoom:50%;" />

以表为依据，根据业务将不同表拆分到不同库中。

特点：

- 每个库的表结构都不一样。
- 每个库的数据也不一样。
- 所有库的并集是全量数据。

② 垂直分表

<img src="https://i-blog.csdnimg.cn/direct/78648e3f32bd4555b66edba7c2d2245a.png" alt="img" style="zoom:50%;" />

以字段为依据，根据字段属性将不同字段拆分到不同表中。

特点：

- 每个表的结构都不一样。
- 每个表的数据也不一样，一般通过一列（主键 / 外键）关联。
- 所有表的并集是全量数据。

(4) 水平拆分

① 水平分库

<img src="https://i-blog.csdnimg.cn/direct/70bb4993d9ff41e88f80d6ba789f6b0e.png" alt="img" style="zoom:50%;" />

以字段为依据，按照一定策略，将一个库的数据拆分到多个库中。

特点：

- 每个库的表结构都一样。
- 每个库的数据都不一样。
- 所有库的并集是全量数据。

② 水平分表

<img src="https://i-blog.csdnimg.cn/direct/e20c779df7c44b03a93b228f39b9993c.png" alt="img" style="zoom: 50%;" />

以字段为依据，按照一定策略，将一个表的数据拆分到多个表中。

特点：

- 每个表的表结构都一样。
- 每个表的数据都不一样。
- 所有表的并集是全量数据。

#### 2. Mycat 入门

(1) 安装

Mycat 是采用 java 语言开发的开源的数据库中间件，支持 Windows 和 Linux 运行环境，下面介绍 Mycat 在 Linux 中的环境搭建，我们需要在准备好的服务器中安装如下软件。

- MySQL
- JDK
- Mycat

| 服务器          | 安装软件   | 说明               |
| --------------- | ---------- | ------------------ |
| 192.168.200.210 | JDK、Mycat | Mycat 中间件服务器 |
| 192.168.200.210 | MySQL      | 分片服务器         |
| 192.168.200.213 | MySQL      | 分片服务器         |
| 192.168.200.214 | MySQL      | 分片服务器         |

(2) 概念介绍

<img src="https://i-blog.csdnimg.cn/direct/0e4daa08c0184e36aec31200ed6790fc.png" alt="img" style="zoom: 50%;" />

(3) 需求

由于 tb_order 表中数据量很大，磁盘 IO 及容量都到达了瓶颈，现在需要对 tb_order 表进行数据分片，分为三个数据节点，每一个节点主机位于不同的服务器上，具体的结构，参考下图：

<img src="https://i-blog.csdnimg.cn/direct/254354b1e86f4af8a1e5f145cfd1d62a.png" alt="img" style="zoom:50%;" />

(4) 分片配置

![img](https://i-blog.csdnimg.cn/direct/4b47c4415a1e45609efe6ad252faac58.png)

<img src="https://i-blog.csdnimg.cn/direct/8c5673245b744940a264fdb43551f95c.png" alt="img" style="zoom:50%;" />编

(5) 启动服务

切换到 Mycat 的安装目录，执行如下指令，启动 Mycat：

```bash
#启动
bin/mycat start
#停止
bin/mycat stop
```

Mycat 启动之后，占用端口号 8066。

启动完毕之后，可以查看 logs 目录下的启动日志，查看 Mycat 是否启动完成。

![img](https://i-blog.csdnimg.cn/direct/78baa6f05ef24990bbb9f8a45fb2914a.png)

(6) 分片测试

① 通过如下指令，就可以连接并操作 Mycat。

```bash
mysql -h 192.168.200.210 -P 8066 -uroot -p123456
```

② 然后就可以在 Mycat 中创建表，并往结构中插入数据，查看数据在 MySQL 中的分布情况。

```sql
CREATE TABLE TB_ORDER(
  id BIGINT(20) NOT NULL,
  title VARCHAR(100) NOT NULL,
  PRIMARY KEY (id)
)ENGINE=INNODB DEFAULT CHARSET=utf8;

INSERT INTO TB_ORDER(id,title) VALUES(1,'goods1');
INSERT INTO TB_ORDER(id,title) VALUES(2,'goods2');
INSERT INTO TB_ORDER(id,title) VALUES(3,'goods3');
INSERT INTO TB_ORDER(id,title) VALUES(1000000,'goods1000000');
INSERT INTO TB_ORDER(id,title) VALUES(10000000,'goods10000000');
```

#### 3. MyCat 配置

(1) schema.xml

schema.xml作为MyCat中最重要的配置文件之一,涵盖了MyCat的逻辑库 、逻辑表 、分片规则、分片节点及数据源的配置。

主要包含以下三组标签：

- schema标签
- datanode标签
- datahost标签

① schema标签（第一行）

```XML
<schema name="DB01" checkSQLschema="true" sqlMaxLimit="100" >
    <table name="TB_ORDER" dataNode="dn1,dn2,dn3" rule="auto-sharding-long" />
</schema>
```

schema 标签用于定义 MyCat 实例中的逻辑库，一个 MyCat 实例中，可以有多个逻辑库，可以通过 schema 标签来划分不同的逻辑库。

MyCat 中的逻辑库的概念，等同于 MySQL 中的 database 概念，需要操作某个逻辑库下的表时，也需要切换逻辑库 (use xxx)。

**核心属性：**

- name：指定自定义的逻辑库库名
- checkSQLschema：在 SQL 语句操作时指定了数据库名称，执行时是否自动去除；true：自动去除，false：不自动去除
- sqlMaxLimit：如果未指定 limit 进行查询，列表查询模式查询多少条记录

② table 标签

```XML
<schema name="DB01" checkSQLschema="true" sqlMaxLimit="100" >
    <table name="TB_ORDER" dataNode="dn1,dn2,dn3" rule="auto-sharding-long" />
</schema>
```

table 标签定义了 MyCat 中逻辑库 schema 下的逻辑表，所有需要拆分的表都需要在 table 标签中定义。

**核心属性：**

- name：定义逻辑表表名，在该逻辑库下唯一
- dataNode：定义逻辑表所属的 dataNode，该属性需要与 dataNode 标签中 name 对应；多个 dataNode 逗号分隔
- rule：分片规则的名字，分片规则名字是在 rule.xml 中定义的
- primaryKey：逻辑表对应真实表的主键
- type：逻辑表的类型，目前逻辑表只有全局表和普通表，如果未配置，就是普通表；全局表，配置为 global

③ dataNode 标签

```XML
<dataNode name="dn1" dataHost="dhost1" database="db01" />
<dataNode name="dn2" dataHost="dhost2" database="db01" />
<dataNode name="dn3" dataHost="dhost3" database="db01" />
```

dataNode 标签中定义了 MyCat 中的数据节点，也就是我们通常说的数据分片。一个 dataNode 标签就是一个独立的数据分片。

**核心属性：**

- name：定义数据节点名称
- dataHost：数据库实例主机名称，引用自 dataHost 标签中 name 属性
- database：定义分片所属数据库

④ dataHost 标签

```XML
<dataHost name="dhost1" maxCon="1000" minCon="10" balance="0" writeType="0" dbType="mysql" dbDriver="jdbc">
    <heartbeat>select user()</heartbeat>
    <writeHost host="master" url="jdbc:mysql://192.168.200.210:3306?useSSL=false&amp;serverTimezone=Asia/Shanghai&amp;characterEncoding=utf8"
        user="root" password="1234">
    </writeHost>
</dataHost>
```

**核心属性：**

- name：唯一标识，供上层标签使用
- maxCon/minCon：最大连接数 / 最小连接数
- balance：负载均衡策略，取值 0,1,2,3
- writeType：写操作分发方式（0：写操作转发到第一个 writeHost，第一个挂了，切换到第二个；1：写操作随机分发到配置的 writeHost）
- dbDriver：数据库驱动，支持 native、jdbc

<img src="https://i-blog.csdnimg.cn/direct/b906f37594b04429adf521a53bccb4b6.png" alt="img" style="zoom:50%;" />

(2) rule.xml

rule.xml 中定义所有分表的规则，在使用过程中可以灵活的使用分片算法，或者对同一个分片算法使用不同的参数，它让分片过程可配置化。主要包含两类标签：tableRule、function。

<img src="https://i-blog.csdnimg.cn/direct/82a29dfaf585416192f9fcbd34d75313.png" alt="img" style="zoom:50%;" />

(3) server.xml

① system 标签

```XML
<system>
    <property name="nonePasswordLogin">0</property>
    <property name="useHandshakeV10">1</property>
    <property name="useSqlStat">1</property>
</system>
```

② user 标签

<img src="https://i-blog.csdnimg.cn/direct/4e6cf21dd74b4a2b9c33e085f338e13b.png" alt="img" style="zoom:50%;" />

### 分库分表

#### 1. 垂直拆分

(1) 场景

<img src="https://i-blog.csdnimg.cn/direct/d51e8b2beab84fa88a64c883e54ab43b.png" alt="img" style="zoom:50%;" />

(2) 配置

```XML
<schema name="SHOPPING" checkSQLschema="true" sqlMaxLimit="100" >
    <table name="tb_goods_base" dataNode="dn1" primaryKey="id"/>
    <table name="tb_goods_cat" dataNode="dn1" primaryKey="id"/>
    <table name="tb_goods_desc" dataNode="dn1" primaryKey="goods_id"/>
    <table name="tb_goods_item" dataNode="dn1" primaryKey="id"/>
    <table name="tb_order_item" dataNode="dn2" primaryKey="id"/>
    <table name="tb_order_master" dataNode="dn2" primaryKey="order_id" rule="order_rule" />
    <table name="tb_order_pay_log" dataNode="dn2" primaryKey="out_trade_no"/>
    <table name="tb_user" dataNode="dn3" primaryKey="id"/>
    <table name="tb_areas_provinces" dataNode="dn3" primaryKey="id"/>
    <table name="tb_areas_city" dataNode="dn3" primaryKey="id"/>
    <table name="tb_areas_region" dataNode="dn3" primaryKey="id"/>
    <table name="tb_user_address" dataNode="dn3" primaryKey="id"/>
</schema>

<dataNode name="dn1" dataHost="dhost1" database="shopping" />
<dataNode name="dn2" dataHost="dhost2" database="shopping" />
<dataNode name="dn3" dataHost="dhost3" database="shopping" />
```

**说明：**

schema 节点下关联多个 table 标签，不同 table 对应不同 dataNode：

① dn1 对应商品类表（如 tb_goods_base、tb_goods_cat 等）

② dn2 对应订单类表（如 tb_order_item、tb_order_master 等）

③ dn3 对应用户及地址类表（如 tb_user、tb_areas_provinces 等）

(3) 测试

① 在 mycat 的命令行中，通过 source 指令导入表结构及对应数据，查看数据分布情况：

```bash
source /root/shopping_table.sql
source /root/shopping_insert.sql
```

② 查询用户的收件人及收件人地址信息 (包含省、市、区)：

```sql
select ua.user_id,ua.contact,p.province,c.city,r.area,ua.address from tb_user_address ua,tb_areas_city c,tb_areas_provinces p,tb_areas_region r where ua.province_id = p.provinceid and ua.city_id = c.cityid and ua.town_id = r.areaid ;
```

③ 查询每一笔订单及订单的收件地址信息 (包含省、市、区)：

```sql
SELECT o.order_id, p.payment,o.receiver,p.province,c.city,r.area FROM tb_order_master o,tb_areas_provinces p,tb_areas_city c,tb_areas_region r WHERE o.receiver_province = p.provinceid AND o.receiver_city = c.cityid AND o.receiver_region = r.areaid ;
```

(4) 全局表配置

对于省、市、区 / 县表`tb_areas_provinces`, `tb_areas_city`, `tb_areas_region`，是属于数据字典表，在多个业务模块中都可能会遇到，可以将其设置为全局表，利于业务操作。

```XML
<table name="tb_areas_provinces" dataNode="dn1,dn2,dn3" primaryKey="id" type="global"/>
<table name="tb_areas_city" dataNode="dn1,dn2,dn3" primaryKey="id" type="global"/>
<table name="tb_areas_region" dataNode="dn1,dn2,dn3" primaryKey="id" type="global"/>
```

#### 2. 水平拆分

(1) 场景

在业务系统中，有一张表 (日志表)，业务系统每天都会产生大量的日志数据，单台服务器的数据存储及处理能力是有限的，可以对数据库表进行拆分。

(2) 配置

① shema.xml

```XML
<schema name="ITCAST" checkSQLschema="true" sqlMaxLimit="100" >
    <table name="tb_log" dataNode="dn4,dn5,dn6" rule="mod-long" />
</schema>
<dataNode name="dn4" dataHost="dhost1" database="itcast" />
<dataNode name="dn5" dataHost="dhost2" database="itcast" />
<dataNode name="dn6" dataHost="dhost3" database="itcast" />
```

② server.xml

```XML
<user name="root" defaultAccount="true">
    <property name="password">123456</property>
    <property name="schemas">SHOPPING,ITCAST</property>
    <!-- 表级 DML 权限设置 -->
    <!--
    <privileges check="false">
        <schema name="TESTDB" dml="0110">
            <table name="tb01" dml="0000"></table>
            <table name="tb02" dml="1111"></table>
        </schema>
    </privileges>
    -->
</user>
```

(3) 测试

在 mycat 的命令行中，执行如下 SQL 建表、并插入数据，查看数据分布情况。

```sql
CREATE TABLE tb_log (
id bigint(20) NOT NULL COMMENT 'ID',
model_name varchar(200) DEFAULT NULL COMMENT '模块名',
model_value varchar(200) DEFAULT NULL COMMENT '模块值',
type varchar(200) DEFAULT NULL COMMENT '类型',
return_value varchar(200) DEFAULT NULL COMMENT '返回值',
return_class varchar(200) DEFAULT NULL COMMENT '返回类型',
operate_user varchar(200) DEFAULT NULL COMMENT '操作用户',
operate_time timestamp NULL DEFAULT NULL COMMENT '操作时间',
param_and_value varchar(500) DEFAULT NULL COMMENT '请求参数名及参数值',
operate_class varchar(200) DEFAULT NULL COMMENT '操作类',
operate_method varchar(200) DEFAULT NULL COMMENT '操作方法',
cost_time bigint(20) DEFAULT NULL COMMENT '执行方法耗时,单位ms',
summary text DEFAULT NULL COMMENT '摘要 1.2,Arond.102',
PRIMARY KEY (id)
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### 3. 分片规则

(1) 范围分片

根据指定的字段及其配置的范围与数据节点的对应情况，来决定该数据属于哪一个分片。

<img src="https://i-blog.csdnimg.cn/direct/c27181c1e5cd4338b7115a70f4060317.png" alt="img" style="zoom:50%;" />

**说明：**

- 0~5000000 → dataNode1
- 5000001~10000000 → dataNode2
- 10000001 及以上 → dataNode3

<img src="https://i-blog.csdnimg.cn/direct/7f89fdd445334948b94c7a0c8d4a692a.png" alt="img" style="zoom: 80%;" />

(2) 取模分片

根据指定的字段值与节点数量进行求模运算，根据运算结果，来决定该数据属于哪一个分片。

<img src="https://i-blog.csdnimg.cn/direct/42ee9400cf404ca997810aa1a0ba99b2.png" alt="img" style="zoom:67%;" />

**说明：**通过`id % 3`的结果分配数据：

- `id%3=0` → dataNode1
- `id%3=1` → dataNode2
- `id%3=2` → dataNode3

(3) 一致性hash 分片

所谓一致性哈希，相同的哈希因子计算总是被划分到相同的分区表中，不会因为分区节点的增加而改变原来数据的分区位置。

<img src="https://i-blog.csdnimg.cn/direct/9d1546669bef408885704b730862444e.png" alt="img" style="zoom:67%;" />

① schema.xml

```XML
<table name="tb_order" dataNode="dn4,dn5,dn6" rule="sharding-by-murmur" />

<dataNode name="dn4" dataHost="dhost1" database="itcast" />
<dataNode name="dn5" dataHost="dhost2" database="itcast" />
<dataNode name="dn6" dataHost="dhost3" database="itcast" />
```

② rule.xml

```XML
<tableRule name="sharding-by-murmur">
    <rule>
        <columns>id</columns>
        <algorithm>murmur</algorithm>
    </rule>
</tableRule>

<function name="murmur" class="io.mycat.route.function.PartitionByMurmurHash">
    <property name="seed">0</property> <!-- 默认是0 -->
    <property name="count">3</property> <!-- 要分片的数据库节点数，必须指定，否则没法分片 -->
    <property name="virtualBucketTimes">160</property> <!-- 一个实际的数据库节点被映射为这么多虚拟节点，默认是160倍，也就是虚拟节点数是物理节点数的160倍 -->
    <!-- <property name="weightMapFile">weightMapFile</property> 节点的权重，没有指定权重的节点默认是1。 -->
</function>
```

(4) 枚举分片

通过在配置文件中配置可能的枚举值，指定数据分布到不同数据库节点上。本规则适用于按照省份、性别、状态拆分数据等业务。

<img src="https://i-blog.csdnimg.cn/direct/2e016703bb864e3ea632e9b4a066a05a.png" alt="img" style="zoom: 50%;" />

(5) 应用指定算法

运行阶段由应用自主决定路由到哪个分片，直接根据字符串（必须是数字）计算分片号。

![img](https://i-blog.csdnimg.cn/direct/873c0bc5a3cb41c9b092b5b3a341041d.png)

**说明：**

- 00xxxx → 对应 dataNode1 的数据库
- 01xxxx → 对应 dataNode2 的数据库
- 02xxxx → 对应 dataNode3 的数据库

<img src="https://i-blog.csdnimg.cn/direct/0093a75c30d541dfb3f8fa26c711ce25.png" alt="img" style="zoom: 80%;" />

(6) 固定hash算法

该算法类似于十进制的求模运算，但是为二进制的操作，例如，取 id 的二进制低 10 位与`1111111111`进行位 & 运算。

<img src="https://i-blog.csdnimg.cn/direct/06f2a8048b424d6b82e4dc9a442f5f4b.png" alt="img" style="zoom: 50%;" />

**说明：**

① 任何一个十位的二进制与 1111111111（十位全1）进行与运算后的结果，**结果就是这个十位二进制数本身。**

② 原因是这个二进制数的每一位都是 1，因此在与运算中：

- 如果原数某一位是 1 → 1 & 1 = 1
- 如果原数某一位是 0 → 0 & 1 = 0

也就是说，它不会改变原数的任何一位，只是保留原数的所有位。

③ 举例验证：假设原数是 **`1010101010`**（十位）：

```bash
    1010101010
  & 1111111111
  -----------
    1010101010  ← 结果和原数完全相同
```

<img src="https://i-blog.csdnimg.cn/direct/ec12e1391c5447e29d4581ef01dd06e3.png" alt="img" style="zoom:80%;" />

(7) 字符串hash解析

截取字符串中的指定位置的子字符串，进行hash算法，算出分片

<img src="https://i-blog.csdnimg.cn/direct/b4c75d51d43a415fa808373bfc8189f9.png" alt="img" style="zoom:67%;" />

<img src="https://i-blog.csdnimg.cn/direct/5a3f64339e7f4cfebee538f3d59c2d7d.png" alt="img" style="zoom: 80%;" />

**运算示例：**

以 “world” 为例：

- 截取子串：`world` → 取`0:2`对应 “wor”
- 执行 hash 运算：得到结果 26629
- 计算分片：`26629 & (1024-1) = 5`

(8) 按天分片

<img src="https://i-blog.csdnimg.cn/direct/3202a10b80e048e6b7a75e6ca370c764.png" alt="img" style="zoom: 80%;" />

**说明：**

**配置参数：**`begin:2022-01-01`、`end:2022-01-30`、`partitionDay:10`

分片时间区间与 dataNode 对应：

- `2022-01-01 ~ 2022-01-10` → dataNode1
- `2022-01-11 ~ 2022-01-20` → dataNode2
- `2022-01-21 ~ 2022-01-30` → dataNode3

<img src="https://i-blog.csdnimg.cn/direct/65fbfb349c6c49e5bfafaf42dcf52b16.png" alt="img" style="zoom:80%;" />

(9) 按月分片

使用场景为按月份来分片，每个自然月为一个分片

<img src="https://i-blog.csdnimg.cn/direct/4e408a54917444cdbfef34025e91efba.png" alt="img" style="zoom:80%;" />

**说明：**

分片时间范围为 `begin:2022-01-01` 至 `end:2022-03-31`，数据按月份对应到不同 dataNode：

- dataNode1 对应数据：2022-01-10、2022-04-12（注：结束时间后会循环分片）
- dataNode2 对应数据：2022-02-20
- dataNode3 对应数据：2022-03-31

<img src="https://i-blog.csdnimg.cn/direct/a290c4c0e7e144449de600820a624df6.png" alt="img" style="zoom:80%;" />

#### 4. Mycat 管理及监控

(1) Mycat 原理

<img src="https://i-blog.csdnimg.cn/direct/452493d868b6455880536d26c7c585dc.png" alt="img" style="zoom:80%;" />

① `select * from tb_user;`

- 客户端把 SQL 发给 Mycat Server；
- Mycat 先**解析 SQL**，再做**分片分析**（按规则，这个 SQL 要查所有分片）；
- 经**路由分析**，确定要访问右边 3 个数据库节点；
- 从 3 个节点取数据后，做**分页、排序、聚合、结果合并**；
- 把合并后的结果返回给客户端。

② `select * from tb_user where status in(1,3) order by id;`

- 客户端发 SQL 后，Mycat 解析出`status`条件；
- 分片分析 + 路由分析：只需要访问`status=1`（dn1）和`status=3`（dn3）的数据库；
- 从这 2 个节点取数据后，做**排序处理 + 结果合并**；
- 返回最终结果给客户端。

(2) Mycat 管理

① Mycat 默认开通 2 个端口，可在`server.xml`中修改：

- 8066 数据访问端口，用于执行 DML 和 DDL 操作。
- 9066 数据库管理端口，用于管理 Mycat 集群状态。

② 连接管理端口的命令：

```bash
mysql -h 192.168.200.210 -P 9066 -uroot -p123456
```

③ Mycat 管理命令及含义：

| 命令              | 含义                          |
| ----------------- | ----------------------------- |
| show @@help       | 查看 Mycat 管理工具文档       |
| show @@version    | 查看 Mycat 的版本             |
| reload @@config   | 重新加载 Mycat 的配置文件     |
| show @@datasource | 查看 Mycat 的数据源信息       |
| show @@datanode   | 查看 Mycat 现有的分片节点信息 |
| show @@threadpool | 查看 Mycat 的线程池信息       |
| show @@sql        | 查看执行的 SQL                |
| show @@sql.sum    | 查看执行的 SQL 统计           |

### 读写分离

#### 1. 介绍

(1) 读写分离，简单地说是把对数据库的读和写操作分开，对应不同的数据库服务器。主数据库提供写操作，从数据库提供读操作，这样能有效地减轻单台数据库的压力。

(2) 通过 MyCat 即可轻易实现上述功能，不仅可以支持 MySQL，也可以支持 Oracle 和 SQL Server。

<img src="https://i-blog.csdnimg.cn/direct/5e4bb87fc0d643f282e8d04987e0e880.png" alt="img" style="zoom: 67%;" />

**说明：**

① 应用程序连接 MyCat，MyCat 将`insert/update/delete`操作路由到`writeHost`对应的主库（mysql (m)）

② 将`select`操作路由到`readHost`对应的从库（mysql (s)）

③ 主库与从库之间通过主从复制（blog）同步数据

#### 2. 一主一从读写分离

(1) 配置

<img src="https://i-blog.csdnimg.cn/direct/8052b0e8bfc34409b5931de7d5f9854e.png" alt="img" style="zoom: 67%;" />

![img](https://i-blog.csdnimg.cn/direct/226b69aee3c040ea9a39b66796d27424.png)

Mycat 中`balance`参数的取值及含义说明表：

| 参数值 | 含义                                                         |
| ------ | ------------------------------------------------------------ |
| 0      | 不开启读写分离机制，所有读操作都发送到当前可用的 writeHost 上 |
| 1      | 全部的 readHost 与备用的 writeHost 都参与 select 语句的负载均衡（主要针对于双主双从模式） |
| 2      | 所有的读写操作都随机在 writeHost、readHost 上分发            |
| 3      | 所有的读请求随机分发到 writeHost 对应的 readHost 上执行，writeHost 不负担读压力 |

#### 3. 双主双从

(1) 介绍

一个主机 Master1 用于处理所有写请求，它的从机 Slave1 和另一台主机 Master2 还有它的从机 Slave2 负责所有读请求。当 Master1 主机宕机后，Master2 主机负责写请求，Master1、Master2 互为备机。架构图如下：

![img](https://i-blog.csdnimg.cn/direct/e66e9933ea8640469c1dc526f7680726.png)

**说明：**

① 应用程序连接 MyCat，MyCat 分发请求；

② mysql (m1)（Master1）复制数据到 mysql (s1)（Slave1），mysql (m2)（Master2）复制数据到 mysql (s2)（Slave2），同时 mysql (m1) 与 mysql (m2) 之间也存在复制关系，mysql (m1) 为主、mysql (m2) 为备

**Q：**主库不是负责写的吗？为什么 Master2 负责读了？

**A：**双主双从中，Master1 是 “主用主库”**：默认承担所有写请求；****而 Master2 是**“备用主库”

- 平时（Master1 正常运行时），它不处理写请求，而是作为**读节点**来分担读压力（和 Slave1、Slave2 一起负责读请求）；
- 只有当 Master1 宕机后，它才会切换为 “主库”，接手写请求。

(2) 准备工作

我们需要准备 5 台服务器，具体的服务器及软件安装情况如下：

| 编号 | IP              | 预装软件     | 角色               |
| ---- | --------------- | ------------ | ------------------ |
| 1    | 192.168.200.210 | MyCat、MySQL | MyCat 中间件服务器 |
| 2    | 192.168.200.211 | MySQL        | M1（Master1）      |
| 3    | 192.168.200.212 | MySQL        | S1（Slave1）       |
| 4    | 192.168.200.213 | MySQL        | M2（Master2）      |
| 5    | 192.168.200.214 | MySQL        | S2（Slave2）       |

关闭以上所有服务器的防火墙：

- `systemctl stop firewalld`
- `systemctl disable firewalld`

(3) 搭建

① 主库配置（M1）

修改配置文件 /etc/my.cnf

```bash
#mysql 服务ID，保证整个集群环境中唯一，取值范围：1 - 2^32-1，默认为1
server-id=1
#指定同步的数据库
binlog-do-db=db01
binlog-do-db=db02
binlog-do-db=db03
#在作为从数据库的时候，有写入操作也要更新二进制日志文件
log-slave-updates
```

重启 MySQL 服务器

```bash
systemctl restart mysqld
```

② 主库配置（M2）

修改配置文件 `/etc/my.cnf`

```bash
#mysql 服务ID，保证整个集群环境中唯一，取值范围：1 - 2^32-1，默认为1
server-id=3
#指定同步的数据库
binlog-do-db=db01
binlog-do-db=db02
binlog-do-db=db03
#在作为从数据库的时候，有写入操作也要更新二进制日志文件
log-slave-updates
```

重启 MySQL 服务器

```bash
systemctl restart mysqld
```

③ 两台主库创建账户并授权（注：该操作需在 Master1、Master2 两台主库分别执行）

```bash
# 创建itcast用户，并设置密码，该用户可在任意主机连接该MySQL服务
CREATE USER 'itcast'@'%' IDENTIFIED WITH mysql_native_password BY 'Root@123456';

# 为'itcast'@'%'用户分配主从复制权限
GRANT REPLICATION SLAVE ON *.* TO 'itcast'@'%';
```

查看两台主库的二进制日志坐标

```bash
show master status;
```

④ 从库配置（S1）

修改配置文件 `/etc/my.cnf`

```bash
#mysql 服务ID，保证整个集群环境中唯一，取值范围：1 - 2^32-1，默认为1
server-id=2
```

重启 MySQL 服务器

```bash
systemctl restart mysqld
```

⑤ 从库配置（S2）

修改配置文件 `/etc/my.cnf`

```bash
#mysql 服务ID，保证整个集群环境中唯一，取值范围：1 - 2^32-1，默认为1
server-id=4
```

重启 MySQL 服务器

```bash
systemctl restart mysqld
```

⑥ 两台从库关联的从库

执行`CHANGE MASTER TO`命令，关联对应的主库（注意：slave1 对应 master1，slave2 对应 master2）：

```sql
CHANGE MASTER TO 
MASTER_HOST='xxx.xxx.xxx.xxx',  # 对应主库的IP
MASTER_USER='xxx',             # 主库授权的复制用户（如itcast）
MASTER_PASSWORD='xxx',         # 复制用户的密码（如Root@123456）
MASTER_LOG_FILE='xxx',         # 主库`show master status`查到的日志文件名
MASTER_LOG_POS=xxx;            # 主库`show master status`查到的日志位置
```

启动两台从库主从复制，查看从库状态

```sql
# 启动主从复制
start slave;

# 查看从库状态（需确保Slave_IO_Running、Slave_SQL_Running均为Yes）
show slave status\G;
```

(4) 测试

分别在两台主库Master1、Master2上执行DDL、DML语句，查看涉及到的数据库服务器的数据同步情况。

```sql
create database db01;
use db01;
create table tb_user(
	id in(11)not null primary key,
	name varchar(50) not null,
	sex varcahr(1)
)engine=innodb default charset=utf8mb4

insert into tb user(id,name,sex) values(l,'Tom','1');
insert into tb user(id,name,sex) values(2,'Trigger','0');
insert into tb user(id,name,sex) values(3,'Dawn','1');
insert into tb user(id,name,sex) values(4,"ack Ma','1');
insertinto tb user(id,name,sex) values(5,'Coco','0');
insert into tb user(id,name,sex) values(6,'erry','1');
```

#### 4. 双主双从读写分离

(1) 配置

![img](https://i-blog.csdnimg.cn/direct/b5d3b8b0175447338de4620bad79b7f6.png)

![img](https://i-blog.csdnimg.cn/direct/453a8ea27dda45fbb11d594ea78f077d.png)

(2) 测试

① 登录MyCat，测试查询及更新操作，判定是否能够进行读写分离，以及读写分离的策略是否正确。

② 当主库挂掉一个之后，是否能够自动切换。