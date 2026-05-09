---
title: MySQL学习笔记之进阶篇
date: 2026-03-28 11:00:00
categories:
  - MySQL
tags:
  - MySQL
cover: /img/mysql-jinjie.jpg
---

### 存储引擎

#### MySQL体系结构：

<img src="https://i-blog.csdnimg.cn/direct/6170649c7b214229a6eca670767bffe5.png" alt="img" style="zoom: 50%;" />

(1) 连接层：最上层是一些客户端和链接服务，主要完成一些类似于连接处理、授权认证、及相关的安全方案。服务器也会为安全接入的每个客户端验证它所具有的操作权限。

(2) 服务层：第二层架构主要完成大多数的核心服务功能，如 SQL 接口，并完成缓存的查询，SQL 的分析和优化，部分内置函数的执行。所有跨存储引擎的功能也在这一层实现，如过程、函数等。

(3) 引擎层：存储引擎真正的负责了 MySQL 中数据的存储和提取，服务器通过 API 和存储引擎进行通信。不同的存储引擎具有不同的功能，这样我们可以根据自己的需要，来选取合适的存储引擎。

(4) 存储层：主要是将数据存储在文件系统之上，并完成与存储引擎的交互。

#### 存储引擎

(1) 存储引擎就是存储数据、建立索引、更新/查询数据等技术的实现方式。存储引擎是基于表而不是基于库的，所以存储引擎也可以被称为表引擎。

(2) 默认存储引擎是InnoDB。

(3) 相关操作：

```
-- 查询建表语句
show create table account;
-- 建表时指定存储引擎
CREATE TABLE 表名(
	...
) ENGINE=INNODB;
-- 查看当前数据库支持的存储引擎
show engines;
```

#### InnoDB

(1) InnoDB 是一种兼顾高可靠性和高性能的通用存储引擎，在 MySQL 5.5 之后，InnoDB 是默认的 MySQL 引擎

(2) 特点：

- DML 操作遵循 ACID 模型，支持**事务**
- **行级锁**，提高并发访问性能
- 支持**外键**约束，保证数据的完整性和正确性

**① 表锁：**锁住**整个表**的锁。当某个人操作（增删改）这个表时，会把整个表 “锁起来”，其他人在锁释放前，**不能操作这个表的任何数据**。

**② 行锁（hang suo）：**只锁住**表中某一行（或几行）数据**的锁。当某个人操作某一行时，只锁这一行，其他行的数据还是可以被其他人正常操作。

(3) 文件：

- xxx.ibd: xxx代表表名，InnoDB 引擎的每张表都会对应这样一个表空间文件，存储该表的表结构（frm、sdi）、数据和索引。

参数：innodb_file_per_table，决定多张表共享一个表空间还是每张表对应一个表空间

(4) InnoDB 逻辑存储结构：

<img src="https://i-blog.csdnimg.cn/direct/806d7a819fbc4a2cb1b14109a51da70b.png" alt="img" style="zoom:50%;" />

#### MyISAM

(1) MyISAM 是 MySQL 早期的默认存储引擎。

(2) 特点：

- 不支持事务，不支持外键
- 支持表锁，不支持行锁
- 访问速度快

(3) 文件：

- xxx.sdi: 存储表结构信息
- xxx.MYD: 存储数据
- xxx.MYI: 存储索引

#### Memory

(1) Memory 引擎的表数据是存储在内存中的，受硬件问题、断电问题的影响，只能将这些表作为临时表或缓存使用。

(2) 特点：

- 存放在内存中，速度快
- hash索引（默认）

(3) 文件：

- xxx.sdi: 存储表结构信息

#### 存储引擎特点

| 特点         | InnoDB              | MyISAM | Memory |
| ------------ | ------------------- | ------ | ------ |
| 存储限制     | 64TB                | 有     | 有     |
| 事务安全     | 支持                | -      | -      |
| 锁机制       | 行锁                | 表锁   | 表锁   |
| B+tree索引   | 支持                | 支持   | 支持   |
| Hash索引     | -                   | -      | 支持   |
| 全文索引     | 支持（5.6版本之后） | 支持   | -      |
| 空间使用     | 高                  | 低     | N/A    |
| 内存使用     | 高                  | 低     | 中等   |
| 批量插入速度 | 低                  | 高     | 高     |
| 支持外键     | 支持                | -      | -      |

#### 存储引擎的选择

(1) 在选择存储引擎时，应该根据应用系统的特点选择合适的存储引擎。对于复杂的应用系统，还可以根据实际情况选择多种存储引擎进行组合。

- InnoDB: 如果应用对事物的完整性有比较高的要求，在并发条件下要求数据的一致性，数据操作除了插入和查询之外，还包含很多的更新、删除操作，则 InnoDB 是比较合适的选择
- MyISAM: 如果应用是以读操作和插入操作为主，只有很少的更新和删除操作，并且对事务的完整性、并发性要求不高，那这个存储引擎是非常合适的。
- Memory: 将所有数据保存在内存中，访问速度快，通常用于临时表及缓存。Memory 的缺陷是对表的大小有限制，太大的表无法缓存在内存中，而且无法保障数据的安全性

电商中的足迹和评论适合使用 MyISAM 引擎，缓存适合使用 Memory 引擎。

### 索引

索引是帮助 MySQL **高效获取数据**的**数据结构（有序）**。在数据之外，数据库系统还维护着满足特定查找算法的数据结构，这些数据结构以某种方式引用（指向）数据，这样就可以在这些数据结构上实现高级查询算法，这种数据结构就是索引。

#### 优缺点：

① 优点：

- 提高数据检索效率，降低数据库的IO成本
- 通过索引列对数据进行排序，降低数据排序的成本，降低CPU的消耗

② 缺点：

- 索引列也是要占用空间的
- 索引大大提高了查询效率，但降低了更新的速度，比如 INSERT、UPDATE、DELETE

#### 索引结构

| 索引结构            | 描述                                                         |
| ------------------- | ------------------------------------------------------------ |
| B+Tree              | 最常见的索引类型，大部分引擎都支持B+树索引                   |
| Hash                | 底层数据结构是用哈希表实现，只有精确匹配索引列的查询才有效，不支持范围查询 |
| R-Tree(空间索引)    | 空间索引是 MyISAM 引擎的一个特殊索引类型，主要用于地理空间数据类型，通常使用较少 |
| Full-Text(全文索引) | 是一种通过建立倒排索引，快速匹配文档的方式，类似于 Lucene, Solr, ES |

| 索引       | InnoDB        | MyISAM | Memory |
| ---------- | ------------- | ------ | ------ |
| B+Tree索引 | 支持          | 支持   | 支持   |
| Hash索引   | 不支持        | 不支持 | 支持   |
| R-Tree索引 | 不支持        | 支持   | 不支持 |
| Full-text  | 5.6版本后支持 | 支持   | 不支持 |

(1) B-Tree（**多路**平衡查找树）

<img src="https://i-blog.csdnimg.cn/direct/a79e23400bf24d3cb599188fc6389891.png" alt="img" style="zoom: 67%;" />

① 二叉树缺点：顺序插入时，会形成一个链表，查询性能大大降低。大数据量情况下，层级较深，检索速度慢。而二叉树的缺点可以用红黑树来解决：

<img src="https://i-blog.csdnimg.cn/direct/83021ec8ce2746398e3082eb74e00e40.png" alt="img" style="zoom:67%;" />

② 红黑树也存在大数据量情况下，层级较深，检索速度慢的问题。为了解决上述问题，可以使用 B-Tree 结构。

③ B-Tree 以一棵最大度数（max-degree，指一个节点的子节点个数）为5（5阶）的 b-tree 为例（每个节点最多存储4个key，5个指针）

<img src="https://i-blog.csdnimg.cn/direct/3e4a3f88550542169e75520eb1060a8a.png" alt="img" style="zoom:67%;" />

(2) B+Tree

![img](https://i-blog.csdnimg.cn/direct/18a3a74a0989417bb6b48e1b69d2a952.png)① 与 B-Tree 的区别：

- 所有的数据都会出现在叶子节点
- 叶子节点形成一个单向链表

② MySQL 索引数据结构对经典的 B+Tree 进行了优化。在原 B+Tree 的基础上，增加一个指向相邻叶子节点的链表指针，就形成了带有顺序指针的 B+Tree，提高区间访问的性能。

<img src="https://i-blog.csdnimg.cn/direct/343b7ac70c0f43958e82be3112479f8f.png" alt="img" style="zoom:50%;" />

(3) Hash

① 哈希索引就是采用一定的hash算法，将键值换算成新的hash值，映射到对应的槽位上，然后存储在hash表中。如果两个（或多个）键值，映射到一个相同的槽位上，他们就产生了hash冲突（也称为hash碰撞），可以通过链表来解决。

<img src="https://i-blog.csdnimg.cn/direct/48d37204478e4b20abd0a1342e541706.png" alt="img" style="zoom:50%;" />

② 特点：

- Hash索引只能用于对等比较（=、in），不支持范围查询（betwwn、>、<、…）
- 无法利用索引完成排序操作
- 查询效率高，通常只需要一次检索就可以了，效率通常要高于 B+Tree 索引

③ 存储引擎支持：

- Memory
- InnoDB: 具有自适应hash功能，hash索引是存储引擎根据 B+Tree 索引在指定条件下自动构建的

(4) 面试题：为什么 InnoDB 存储引擎选择使用 B+Tree 索引结构？

- 相对于二叉树，层级更少，搜索效率高
- 对于 B-Tree，无论是叶子节点还是非叶子节点，都会保存数据，这样导致一页中存储的键值减少，指针也跟着减少，要同样保存大量数据，只能增加树的高度，导致性能降低
- 相对于 Hash 索引，B+Tree 支持范围匹配及排序操作

#### 索引分类

| 分类     | 含义                                                 | 特点                     | 关键字   |
| -------- | ---------------------------------------------------- | ------------------------ | -------- |
| 主键索引 | 针对于表中主键创建的索引                             | 默认自动创建，只能有一个 | PRIMARY  |
| 唯一索引 | 避免同一个表中某数据列中的值重复                     | 可以有多个               | UNIQUE   |
| 常规索引 | 快速定位特定数据                                     | 可以有多个               |          |
| 全文索引 | 全文索引查找的是文本中的关键词，而不是比较索引中的值 | 可以有多个               | FULLTEXT |

(1) 在 InnoDB 存储引擎中，根据索引的存储形式，又可以分为以下两种：

| 分类                      | 含义                                                       | 特点                 |
| ------------------------- | ---------------------------------------------------------- | -------------------- |
| 聚集索引(Clustered Index) | 将数据存储与索引放一块，索引结构的叶子节点保存了行数据     | 必须有，而且只有一个 |
| 二级索引(Secondary Index) | 将数据与索引分开存储，索引结构的叶子节点关联的是对应的主键 | 可以存在多个         |

Q：叶子节点是什么？

A：叶子节点是 **树结构中没有子节点的节点**，也就是树的「最底层终端节点」

(2) 演示图：

<img src="https://i-blog.csdnimg.cn/direct/7ca8e2a9c225486f9147ae0f3edd19cb.png" alt="img" style="zoom: 50%;" />

(3) 聚集索引选取规则：

- 如果存在主键，主键索引就是聚集索引
- 如果不存在主键，将使用第一个唯一(UNIQUE)索引作为聚集索引
- 如果表没有主键或没有合适的唯一索引，则 InnoDB 会自动生成一个 rowid 作为隐藏的聚集索引

(4) 思考题

① 以下 SQL 语句，哪个执行效率高？为什么？

```sql
select * from user where id = 10;
select * from user where name = 'Arm';
-- 备注：id为主键，name字段创建的有索引
```

答：第一条语句，因为第二条需要回表查询，相当于两个步骤。

(2) InnoDB 主键索引的 B+Tree 高度为多少？

答：假设一行数据大小为1k，一页中可以存储16行这样的数据。InnoDB 的指针占用6个字节的空间，主键假设为bigint，占用字节数为8，可得公式：

```sql
n×8（主键总大小） + (n+1)×6（指针总大小） = 16×1024（页大小）
```

其中 8 表示 bigint 占用的字节数，n 表示当前节点存储的key的数量，(n + 1) 表示指针数量（比key多一个）。算出n约为1170。

① 如果树的高度为2，那么他能存储的数据量为：

- 根节点是 1 个非叶子节点，有 1171 个指针；
- 每个指针对应 1 个叶子节点，每个叶子节点存 16 行；
- 总数据量 = 1171（叶子节点数量） × 16（每个叶子节点行数） = 18736 行。

② 如果树的高度为3，那么他能存储的数据量为：`1171 * 1171 * 16 = 21939856`。

- 根节点有 1171 个指针，对应 1171 个中间层非叶子节点；
- 每个中间层非叶子节点又有 1171 个指针，对应 1171 个叶子节点；
- 总数据量 = 1171（中间层数量） × 1171（叶子节点数量） × 16（每个叶子节点行数） ≈ 2193 万行。

#### 语法

(1) 创建索引：

```sql
CREATE [ UNIQUE | FULLTEXT ] INDEX index_name ON table_name (index_col_name, ...);
```

如果 CREATE 后面不加索引类型参数，则创建的是常规索引

(2) 查看索引：

```sql
SHOW INDEX FROM table_name;
```

(3) 删除索引：

```sql
DROP INDEX index_name ON table_name;
```

(4) 案例：

```sql
-- name字段为姓名字段，该字段的值可能会重复，为该字段创建索引
create index idx_user_name on tb_user(name);
-- phone手机号字段的值非空，且唯一，为该字段创建唯一索引
create unique index idx_user_phone on tb_user (phone);
-- 为profession, age, status创建联合索引
create index idx_user_pro_age_stat on tb_user(profession, age, status);
-- 为email建立合适的索引来提升查询效率
create index idx_user_email on tb_user(email);

-- 删除索引
drop index idx_user_email on tb_user;
```

#### 性能分析

(1) 查看执行频次

查看当前数据库的 INSERT, UPDATE, DELETE, SELECT 访问频次：

```sql
SHOW GLOBAL STATUS LIKE 'Com_______';
```

(2) 慢查询日志

① 慢查询日志记录了所有执行时间超过指定参数（long_query_time，单位：秒，默认10秒）的所有SQL语句的日志。

② MySQL的慢查询日志默认没有开启，需要在MySQL的配置文件（/etc/my.cnf）中配置如下信息：

```sql
# 开启慢查询日志开关
slow_query_log=1
# 设置慢查询日志的时间为2秒，SQL语句执行时间超过2秒，就会视为慢查询，记录慢查询日志
long_query_time=2
```

③ 查看慢查询日志开关状态：

```sql
show variables like 'slow_query_log';
```

(3) profile

① show profile 能在做SQL优化时帮我们了解时间都耗费在哪里。通过 have_profiling 参数，能看到当前 MySQL 是否支持 profile 操作：

```sql
SELECT @@have_profiling;
```

② profiling 默认关闭，可以通过set语句在session/global级别开启 profiling：

```sql
SET profiling = 1;
```

③ 查看所有语句的耗时：

```sql
show profiles;
```

④ 查看指定query_id的SQL语句各个阶段的耗时：

```sql
show profile for query query_id;
```

⑤ 查看指定query_id的SQL语句CPU的使用情况

```sql
show profile cpu for query query_id;
```

(4) explain

① EXPLAIN 或者 DESC 命令获取 MySQL 如何执行 SELECT 语句的信息，包括在 SELECT 语句执行过程中表如何连接和连接的顺序。

② 语法：

```bash
# 直接在select语句之前加上关键字 explain / desc
EXPLAIN SELECT 字段列表 FROM 表名 HWERE 条件;
```

③ EXPLAIN 各字段含义：

- id：select 查询的序列号，表示查询中执行 select 子句或者操作表的顺序（id相同，执行顺序从上到下；id不同，值越大越先执行）
- select_type：表示 SELECT 的类型，常见取值有 SIMPLE（简单表，即不适用表连接或者子查询）、PRIMARY（主查询，即外层的查询）、UNION（UNION中的第二个或者后面的查询语句）、SUBQUERY（SELECT/WHERE之后包含了子查询）等
- type：表示连接类型，性能由好到差的连接类型为 NULL、system、const、eq_ref、ref、range、index、all
- possible_key：可能应用在这张表上的索引，一个或多个
- Key：实际使用的索引，如果为 NULL，则没有使用索引
- Key_len：表示索引中使用的字节数，该值为索引字段最大可能长度，并非实际使用长度，在不损失精确性的前提下，长度越短越好
- rows：MySQL认为必须要执行的行数，在InnoDB引擎的表中，是一个估计值，可能并不总是准确的
- filtered：表示返回结果的行数占需读取行数的百分比，filtered的值越大越好

#### 使用规则

(1) 最左前缀法则

① 如果索引关联了多列（联合索引），要遵守最左前缀法则，最左前缀法则指的是查询从索引的最左列开始，并且不跳过索引中的列。

② 如果跳跃某一列，**索引将部分失效**（后面的字段索引失效）。

③ 代码示例：

```sql
-- 走索引，跟顺序没关系
explain select * from tb_user where profession = '软件工程' and age = 31 and status = '0';
explain select * from tb_user where age = 31 and profession = '软件工程' and status = '0';

-- 不走索引，全部失效
explain select * from tb_user where age = 31 and status = '0';

-- 部分失效
explain select * from tb_user where profession = '软件工程' and status = '0';
```

④ 联合索引中，出现范围查询（<, >），范围查询右侧的列索引失效。可以用 >= 或者 <= 来规避索引失效问题。

(2) 索引失效情况

① 在索引列上进行运算操作，索引将失效。例如：

```sql
explain select * from tb_user where substring(phone, 10, 2) = '15';
```

② 字符串类型字段使用时，不加引号，索引将失效。例如：

```sql
-- 此处phone的值没有加引号
explain select * from tb_user where phone = 17799990015;
```

③ 模糊查询中，如果仅仅是尾部模糊匹配，索引不会是失效；如果是头部模糊匹配，索引失效。例如：

```sql
-- 索引失效 
explain select * from tb_user where profession like '软件%';

-- 索引不失效
explain select * from tb_user where profession like '%工程';
```

④ 用 or 分割开的条件，如果 or 其中一个条件的列没有索引，那么涉及的索引都不会被用到。只有两侧都有索引的时候，索引才会生效。如果要让数据的索引不失效，那么要给没有索引的创建索引。

```sql
-- 假设 age 无索引，则第一句索引失效
explain select * from tb_user where id = 10 or age = 23;

-- 为 age 创建索引后，索引成功
create index idx_user_age on tb_user(age);
explain select * from tb_user where id = 10 or age = 23;
```

⑤ 如果 MySQL 评估使用索引比全表更慢，则不使用索引。

#### SQL 提示

这是优化数据库的一个重要手段，简单来说，就是在SQL语句中加入一些人为的提示来达到优化操作的目的。例如：

① 使用索引：

```sql
explain select * from tb_user use index(idx_user_pro) where profession="软件工程";
```

② 不使用哪个索引：

```sql
explain select * from tb_user ignore index(idx_user_pro) where profession="软件工程";
```

③ 必须使用哪个索引：

```sql
explain select * from tb_user force index(idx_user_pro) where profession="软件工程";
```

use 是建议，实际使用哪个索引 MySQL 还会自己权衡运行速度去更改，force就是无论如何都强制使用该索引。

#### 覆盖索引&回表查询

(1) 尽量使用覆盖索引（查询使用了索引，并且需要返回的列，在该索引中已经全部能找到），减少 select *。explain 中 extra 字段含义：

① `using index condition`：查找使用了索引，但是需要回表查询数据

② `using where; using index;`：查找使用了索引，但是需要的数据都在索引列中能找到，所以不需要回表查询

(2) 如果在辅助索引中找聚集索引，只需要通过辅助索引(name)查找到对应的id，返回name和name索引对应的id即可，只需要一次查询。例如：

```sql
select id, name from xxx where name='xxx';
```

(3) 如果是通过辅助索引查找其他字段，则需要回表查询，例如：

```sql
select id, name, gender from xxx where name='xxx';
```

(4) 所以尽量不要用`select *`，容易出现回表查询，降低效率，除非有联合索引包含了所有字段

<img src="https://i-blog.csdnimg.cn/direct/50a1c0a31f024c2594a4062fde46710d.png" alt="img" style="zoom:50%;" />

(5) 面试题：一张表，有四个字段（id, username, password, status），由于数据量大，需要对以下SQL语句进行优化，该如何进行才是最优方案：

```sql
select id, username, password from tb_user where username='itcast';
```

解：给username和password字段建立联合索引，则不需要回表查询，直接覆盖索引，这个优化的核心就是「让索引覆盖查询所需的所有字段」：

- 利用 InnoDB 二级索引默认带主键的特性；
- 把查询需要的非主键字段（password、username）加到联合索引里；
- 最终实现 “一次索引查询就能拿到所有数据”，彻底规避回表的性能损耗。

#### 前缀索引

(1) 当字段类型为字符串（varchar, text等）时，有时候需要索引很长的字符串，这会让索引变得很大，查询时，浪费大量的磁盘IO，影响查询效率，此时可以只将字符串的一部分前缀，建立索引，这样可以大大节约索引空间，从而提高索引效率。

(2) 语法：

```sql
create index idx_xxxx on table_name(columnn(n));

-- 案例：
create index idx_email_5 on tb_user(email(5));
```

(3) 前缀长度：可以根据索引的选择性来决定，而选择性是指不重复的索引值（基数）和数据表的记录总数的比值，**索引选择性越高则查询效率越高，**唯一索引的选择性是1，这是最好的索引选择性，性能也是最好的。

(4) 求选择性公式：

```sql
select count(distinct email) / count(*) from tb_user;
select count(distinct substring(email, 1, 5)) / count(*) from tb_user;
```

show index 里面的sub_part可以看到接取的长度

#### 单列索引&联合索引

(1) 概念

① 单列索引：即一个索引只包含单个列

② 联合索引：即一个索引包含了多个列

在业务场景中，如果存在多个查询条件，考虑针对于查询字段建立索引时，建议建立联合索引，而非单列索引。

(2) 单列索引情况：

```sql
-- 这句只会用到phone索引字段
explain select id, phone, name from tb_user where phone = '17799990010' and name = '韩信';
```

**注意事项**

- 多条件联合查询时，MySQL优化器会评估哪个字段的索引效率更高，会选择该索引完成本次查询

(3) 设计原则

① 针对于**数据量较大，且查询比较频繁**的表建立索引

② 针对于常作为查询条件（where）、排序（order by）、分组（group by）操作的字段建立索引

③ 尽量选择区分度高的列作为索引，尽量**建立唯一索引，**区分度越高，使用索引的效率越高

④ 如果是字符串类型的字段，字段长度较长，可以针对于字段的特点，建立**前缀索引**

⑤ 尽量**使用联合索引**，减少单列索引，查询时，联合索引很多时候可以覆盖索引，节省存储空间，避免回表，提高查询效率

⑥ 要控制索引的数量，索引并不是多多益善，索引越多，维护索引结构的代价就越大，会影响增删改的效率

⑦ 如果索引列不能存储NULL值，请在创建表时使用NOT NULL约束它。当优化器知道每列是否包含NULL值时，它可以更好地确定哪个索引最有效地用于查询

 

### SQL 优化

#### 插入数据

##### 普通插入

① 采用批量插入（一次插入的数据不建议超过1000条）

```sql
Insert into tb_test values(1,'Tom'),(2,'Cat'),(3,'Jerry');
```

② 手动提交事务

```sql
start transaction;
insert into tb_test values(1,'Tom'),(2,'Cat'),(3,'Jerry');
insert into tb_test values(4,'Tom'),(5,'Cat'),(6,'Jerry');
insert into tb_test values(7,'Tom'),(8,'Cat'),(9,'Jerry');
commit;
```

③ 主键顺序插入

```sql
主键乱序插入：8 1 9 21 88 2 4 15 89 5 7 3
主键顺序插入：1 2 3 4 5 7 8 9 15 21 88 89
```

##### 大批量插入：

如果一次性需要插入大批量数据，使用insert语句插入性能较低，此时可以使用MySQL数据库提供的load指令插入。

```bash
# 客户端连接服务端时，加上参数 --local-infile（这一行在bash/cmd界面输入）
mysql --local-infile -u root -p
# 设置全局参数local_infile为1，开启从本地加载文件导入数据的开关
set global local_infile = 1;
select @@local_infile;
# 执行load指令将准备好的数据，加载到表结构中
load data local infile '/root/load_user_100w_sort.sql' into table tb_user fields terminated by ',' lines terminated by '\n';
```

#### 主键优化

##### 数据组织方式：

在InnoDB存储引擎中，表数据都是根据主键顺序组织存放的，这种存储方式的表称为索引组织表（Index organized table, IOT）

![img](https://i-blog.csdnimg.cn/direct/84357dbd81d042f593977164f0938ca6.png)

数据库的存储是：

**表空间（Tablespace） → 段（Segment） → 区（Extent） → 页（Page） → 行（Row）**

##### 页分裂：

页可以为空，也可以填充一半，也可以填充100%，每个页包含了2-N行数据（如果一行数据过大，会行溢出），根据主键排列。

① 触发场景：当你往表中插入数据时，InnoDB 会把数据存到对应的页里。如果**当前页已经没有足够空间存新行**（比如页的使用率快满了），就会触发 “页分裂”。

② 典型过程（以非自增主键插入为例）

![img](https://i-blog.csdnimg.cn/direct/202f1b67d9d242ef9913ae3689ccd4f7.png)

**步骤 1：插入前的页状态**

- 1# 页：存了主键 `1、5、9、23、47` 的 5 条数据（页已经快存满了）；
- 2# 页：存了主键 `55、67、89、101、107` 的 5 条数据；
- 现在要插入 **主键 = 50** 的新行。

<img src="https://i-blog.csdnimg.cn/direct/5c5fe6f0cfb147a198fe8c050e834513.png" alt="img" style="zoom:50%;" />

**步骤 2：插入时的 “位置冲突”**

主键是有序存储的，50 的大小介于 1# 页的最大主键（47）和 2# 页的最小主键（55）之间，所以**50 应该存在 1# 和 2# 页之间**。

但问题是：1# 页已经快存满了，没有空间放 50 这条新数据 → 触发**页分裂**。

**步骤 3：页分裂后的结果**

分裂后：

- 1# 页：把原来的部分数据（23、47）移出去，只留 `1、5、9`；
- 新建 3# 页：把移出的 23、47，加上新插入的 50，存在 3# 页（主键`23、47、50`）；
- 2# 页：保持原来的 `55、67、89、101、107` 不变。

![img](https://i-blog.csdnimg.cn/direct/bbea732734e049988fe21e7d7b377b9a.png)

#### 页合并：

当删除一行记录时，实际上记录并没有被物理删除，只是记录被标记（flaged）为删除并且它的空间变得允许被其他记录声明使用。当页中删除的记录到达 MERGE_THRESHOLD（默认为页的50%），InnoDB会开始寻找最靠近的页（前后）看看是否可以将这两个页合并以优化空间使用。

MERGE_THRESHOLD：合并页的阈值，可以自己设置，在创建表或创建索引时指定

#### 主键设计原则：

- 满足业务需求的情况下，尽量降低主键的长度。主键越长，每个 “索引页（Page）” 能存的主键数量就越少 → 索引树的层数会变多
- 插入数据时，尽量选择顺序插入，选择使用 AUTO_INCREMENT 自增主键
- 尽量不要使用 UUID 做主键或者是其他的自然主键，如身份证号。UUID 是随机生成的，插入时会像之前 “插入 50” 那样，随机插在页的中间位置 → 频繁触发页分裂，既耗性能又产生碎片；
- 业务操作时，避免对主键的修改

#### order by 优化

##### Using filesort：

通过表的索引或全表扫描，读取满足条件的数据行，然后在排序缓冲区 sort buffer 中完成排序操作，所有不是通过索引直接返回排序结果的排序都叫 FileSort 排序

##### Using index：

通过有序索引顺序扫描直接返回有序数据，这种情况即为 using index，不需要额外排序，操作效率高

(3) 如果order by字段全部使用升序排序或者降序排序，则都会走索引，但是如果一个字段升序排序，另一个字段降序排序，则不会走索引，explain的extra信息显示的是`Using index, Using filesort`，如果要优化掉Using filesort，则需要另外再创建一个索引，如：`create index idx_user_age_phone_ad on tb_user(age asc, phone desc);`，此时使用`select id, age, phone from tb_user order by age asc, phone desc;`会全部走索引

```sql
-- 创建索引
create index idx_user_age_phone on tb_user(age,phone);

-- 走索引
explain select id, age, phone from tb_user order by age desc, phone desc;

-- 不走索引，因为索引是 “先age，后phone” 排序的，而 order by 是 “先phone,后age”
explain select id, age, phone from tb_user order by phone, age;

-- 不走索引
explain select id, age, phone from tb_user order by age, phone desc;

-- 创建新的索引后，上面那句走索引
create index idx_user_age_pho_ad on tb_user(age asc, phone desc);
```

(4) 总结：

- 根据排序字段建立合适的索引，多字段排序时，也遵循最左前缀法则
- 尽量使用覆盖索引
- 多字段排序，一个升序一个降序，此时需要注意联合索引在创建时的规则（ASC/DESC）
- 如果不可避免出现filesort，大数据量排序时，可以适当增大排序缓冲区大小 sort_buffer_size（默认256k）

#### group by优化

(1) 在分组操作时，可以通过索引来提高效率

(2) 分组操作时，索引的使用也是**遵循最左前缀法则**的

```sql
-- 创建索引
create index idx_user_pro_age_sta on tb_user(profession,age,status);

-- 走索引
explain select profession, count(*) from tb_user group by profession;

-- 不走索引，不满足最左前缀法则
explain select age, count(*) from tb_user group by age;

-- 走索引
explain select profession, age, count(*) from tb_user group by profession, age;

-- 走索引
explain select profession, age, count(*) from tb_user where profession = '软件工程' group by age;
```

如索引为`idx_user_pro_age_stat`，则句式可以是`select ... where profession order by age`，这样也符合最左前缀法则

#### limit优化

##### 常见的问题：

如`limit 2000000, 10`，此时需要 MySQL 排序前2000000条记录，但仅仅返回2000000 - 2000010的记录，其他记录丢弃，查询排序的代价非常大。

##### 优化方案：

一般分页查询时，通过创建覆盖索引能够比较好地提高性能，可以通过覆盖索引加子查询形式进行优化

##### 例如：

```sql
- 此语句耗时很长
select * from tb_sku limit 9000000, 10;
-- 通过覆盖索引加快速度，直接通过主键索引进行排序及查询
select id from tb_sku order by id limit 9000000, 10;
-- 下面的语句是错误的，因为 MySQL 不支持 in 里面使用 limit
-- select * from tb_sku where id in (select id from tb_sku order by id limit 9000000, 10);
-- 通过连表查询即可实现第一句的效果，并且能达到第二句的速度
select * from tb_sku as s, (select id from tb_sku order by id limit 9000000, 10) as a where s.id = a.id;
```

#### count优化

(1) MyISAM 引擎把一个表的总行数存在了磁盘上，因此执行 count(*) 的时候会直接返回这个数，效率很高（前提是不适用where）；

(2) InnoDB 在执行 count(*) 时，需要把数据一行一行地从引擎里面读出来，然后累计计数。

(3) 优化方案：自己计数，如创建key-value表存储在内存或硬盘，或者是用redis

(4) count 的几种用法：

① 如果 count 函数的参数（count里面写的那个字段）不是NULL（字段值不为NULL），累计值就加一，最后返回累计值

② 用法：count(*)、count(主键)、count(字段)、count(1)

③ count(主键) 跟 count(*) 一样，因为主键不能为空；count(字段) 只计算字段值不为NULL的行；count(1)引擎会为每行添加一个1，然后就count这个1，返回结果也跟count(*)一样；count(null)返回0

(5) 各种用法的性能：

① count(主键)：InnoDB引擎会遍历整张表，把每行的主键id值都取出来，返回给服务层，服务层拿到主键后，直接按行进行累加（主键不可能为空）

② count(字段)：没有not null约束的话，InnoDB引擎会遍历整张表把每一行的字段值都取出来，返回给服务层，服务层判断是否为null，不为null，计数累加；有not null约束的话，InnoDB引擎会遍历整张表把每一行的字段值都取出来，返回给服务层，直接按行进行累加

③ count(1)：InnoDB 引擎遍历整张表，但不取值。服务层对于返回的每一层，放一个数字 1 进去，直接按行进行累加

④ count(*)：InnoDB 引擎并不会把全部字段取出来，而是专门做了优化，不取值，服务层直接按行进行累加

按效率排序：count(字段) < count(主键) < count(1) < count(*)，所以尽量使用 count(*)

#### update优化（避免行锁升级为表锁）

(1) InnoDB 的行锁是针对索引加的锁，不是针对记录加的锁，并且该索引不能失效，否则会从行锁升级为表锁。

(2) 案例：

```sql
-- 这句由于id有主键索引，所以只会锁这一行
update student set no = '123' where id = 1;

-- 这句由于name没有索引，所以会把整张表都锁住进行数据更新，解决方法是给name字段添加索引
update student set no = '123' where name = 'test';
```

### 视图

#### 介绍

(1) 视图(View)是一种虚拟存在的表。视图中的数据并不在数据库中实际存在，行和列数据来自定义视图的查询中使用的表，并且是在使用视图时动态生成的。

(2) 通俗的讲，视图只保存了查询的SQL逻辑，不保存查询结果。所以我们在创建视图的时候，主要的工作就落在创建这条SQL查询语句上。

#### 语法

##### 创建视图：

```sql
CREATE [OR REPLACE] VIEW 视图名称[(列名列表)] AS SELECT语句 [WITH[CASCADED | LOCAL] CHECK OPTION
```

##### 查询视图：

① 查看创建视图语句：

```sql
SHOW CRETE VIEW 视图名称;
```

② 查看视图数据：

```sql
SELECT * FROM 视图名称…;
```

##### 修改视图：

① 方式一：

```sql
CREATE [OR REPLACE] VIEW 视图名称[(列名列表)] AS SELECT语句 [WITH[CASCADED | LOCAL] CHECK OPTION
```

② 方式二：

```sql
ALTER VIEW 视图名称[(列名列表)] AS SELECT语句 [WITH[CASCADED | LOCAL] CHECK OPTION]
```

##### 删除视图：

```sql
DROP VIEW [IF EXISTS]视图名称 [,视图名称]
```

##### 案例：

```sql
-- 创建视图
create or replace view stu_v_1 as select id, name from student where id <= 10;

-- 查询视图
show create view stu_v_1;

select * from stu_v_1;

-- 修改视图
create or replace view stu_v_1 as select id, name, no from student where id <= 10;

alter view stu_v_1 as select id, name from student where id <= 10;

-- 删除视图
drop view if exists stu_v_1;
```

#### 检查选项

##### **视图的检查选项：**

① 当使用 WITH CHECK OPTION 子句创建视图时，MySQL 会通过视图检查正在更改的每个行，例如：插入，更新，删除，以使其符合视图的定义。MySQL 允许基于另一个视图创建视图，它还会检查依赖视图中的规则以保持一致性。

② 为了确定检查的范围，mysql 提供了两个选项:CASCADED 和 LOCAL，默认值为CASCADED。

- **cascaded：**在对创建时含有该字段的视图，插入数据时，该视图依赖的视图都会加上检查，需要**所有条件**都满足才能够插入成功。
- **local：**在对创建时含有该字段的视图，插入数据时，对于该视图依赖的视图中**含有检查语句的条件**进行检查判断。

##### with cascaded check option 的案例：

```sql
-- 创建视图，但不加 with check option
create or replace view stu_v_1 as select id, name from student where id <= 20;

-- 插入成功，会存入基表中（基表无约束），而且会显示在stu_v1视图中
insert into stu_v_1 values(5,'Tom');

-- 插入成功，虽然id=25不满足stu_v1的id <=20，但插入操作会成功（数据会存入student基表，但不会显示在stu_v1视图中），插入成功。
insert into stu_v_1 values(25,'Tom');

create or replace view stu_v_2 as select id, name from stu_v_1 where id >= 10 with cascaded check option;

-- 插入失败，因为不满足stu_v_2的条件：id >= 10
insert into stu_v_2 values(7,'Tom');

-- 插入失败，因为不满足基表stu_v1的条件：id <= 20
insert into stu_v_2 values(26,'Tom');

-- 插入成功
insert into stu_v_1 values(8,'Tom');
```

① 向**无`WITH CHECK OPTION`的视图**插入数据时，只要满足**基表（`student`）的约束**，插入会成功（但不满足视图筛选条件的行，不会显示在视图中）。

② 向**有`WITH CHECK OPTION`的视图**插入数据时，必须满足**当前视图 + 所有底层视图的筛选条件**（`cascaded`是级联检查所有底层视图），否则插入失败。

##### with local check option 的案例：

```sql
-- 创建视图
create or replace view stu_v_4 as select id, name from student where id <= 15 with local check option;

-- 插入成功，id = 5 满足 stu_v4 的 id <= 15，数据存入基表并且会显示在 stu_v4 中
insert into stu_v_4 values(5,'Tom');

-- 插入失败，16 > 15 不满足 stu_v_4 的 Local 约束，会被直接拦截
insert into stu_v_4 values(16,'Tom');

create or replace view stu_v_5 as select id, name from stu_v_4 where id >= 10 with local check option;

-- 插入成功
insert into stu_v_5 values (13,'Tom');

-- 插入失败，因为不满足 stu_v_4 的约束 id <= 15
insert into stu_v_5 values (17,'Tom');

insert into stu_v_5 values (18,'Tom');

create or replace view stu_v_6 as select id, name from stu_v_5 where id < 20;

-- 插入成功，stu_v_6 无 check option，但插入会触发底层的 stu_v_5 的 local 约束
-- 14 >= 10 满足 stu_v_5 的条件，14 <= 15 满足 stu_v_4 的条件
insert into stu_v_6 values (14,'Tom');
```

##### 总结

① 没有 `CHECK OPTION`：不会检查当前视图的`WHERE`条件，即使数据不满足该条件，也能成功存入**基表**；但后续查询该视图时，这条不满足条件的数据**不会在视图结果中显示**

② 有 check option：会按`LOCAL`/`CASCADED`的规则检查对应范围的`WHERE`条件（当前视图 / 底层视图），不满足条件则**插入 / 更新操作直接失败**，数据既不会存入基表，自然也不会在视图中显示

#### 更新及作用

##### **视图的更新：**

要使视图可更新，视图中的行与基础表中的行之间**必须存在一对一的关系**。如果视图包含以下任何一项，则该**视图不可更新**：

- 聚合函数或窗口函数(SUM()、MIN()、MAX()、COUNT()等
- DISTINCT
- GROUP BY
- HAVINGA
- UNION 或者 UNION ALL

##### **作用：**

**① 简单：**视图不仅可以简化用户对数据的理解，也可以简化他们的操作。那些被经常使用的查询可以被定义为视图，从而使得用户不必为以后的操作每次指定全部的条件。

**② 安全：**数据库可以授权，但不能授权到数据库特定行和特定的列上。通过视图用户只能查询和修改他们所能见到的数据。

**③ 数据独立：**视图可帮助用户屏蔽真实表结构变化带来的影响。

##### 案例：

```sql
-- 1.为了保证数据库表的安全性，开发人员在操作tb_user表时，只能看到的用户的基本字段，屏蔽手机号和邮箱两个字段。
create view tb user view as select id,name,profession, age,gender,status,createtime from tb_user;
select *from tb user view;

-- 2.查询每个学生所选修的课程（三张表联查），这个功能在很多的业务中都有使用到，为了简化操作，定义一个视图。
create view tb_stu_course_view 
select s.name student_name, s.no student_no, c.name course_name 
from student s, stuent_course sc, course c 
where s.id = sc.studentid and sc.courseid = c.id;

-- 以后每次只需要进行查询视图即可
select * from tb_stu_course_view;
```

 

### 存储过程

#### 介绍

(1) 存储过程是事先经过编译并存储在数据库中的一段 SQL语句的集合，调用存储过程可以简化应用开发人员的很多工作，减少数据在数据库和应用服务器之间的传输，对于提高数据处理的效率是有好处的。

(2) 存储过程思想上很简单，就是数据库 SOL语言层面的代码封装与重用。

#### **特点：**

- 封装，复用
- 可以接收参数，也可以返回数据
- 减少网络交互，效率提升

#### 基本语法

##### 创建：

```sql
CREATE PROCEDURE 存储过程名称([参数列表])
BEGIN
    -- 这里写要执行的SQL语句（比如查询、插入、更新等）
END;
```

##### 调用：

```sql
CALL 名称([参数]);
```

##### 查看：

```sql
-- 查询数据库的存储过程及状态信息
SELECT* FROM INFORMATION SCHEMA.ROUTINES WHERE ROUTINE_SCHEMA='xx';

-- 查询某个存储过程的定义
SHOW CREATE PROCEDURE 存储过程名称;
```

##### 删除：

```sql
DROP PROCEDURE [IF EXISTS] 存储过程名称;
```

##### 案例：

```sql
-- 存储过程基本语法
-- 创建
create procedure p1()
begin
  select count(*) from student;
end;

-- 调用
call p1();

-- 查看
select * from information_schema.ROUTINES where ROUTINE_SCHEMA = 'itcast';
show create procedure p1;

-- 删除
drop procedure if exists p1;
```

#### 变量

##### 系统变量

① 系统变量 是 MySQL 服务器提供，不是用户定义的，属于服务器层面。分为全局变量(GLOBAL)、会话变量(SESSION)。

② 查看系统变量

```sql
-- 查看所有系统变量
SHOW [SESSION |GLOBAL] VARIABLES ; 

-- 可以通过LKE模糊匹配方式查找变量
SHOW[SESSION|GLOBAL] VARIABLES LIKE '......'; 

-- 查看指定变量的值
SELECT @@[SESSION|GLOBAL] 系统变量名; 
```

③ 设置系统变量

```sql
-- 语法1：直接指定作用域（SESSION/全局）
SET [SESSION | GLOBAL] 系统变量名 = 值;

-- 语法2：用@@指定作用域（和语法1效果一致）
SET @@[SESSION | GLOBAL]系统变量名 = 值;
```

④ 案例：

```sql
-- 变量：系统变量
-- 查看系统变量
show session variables;
show session variables like 'auto%';
show glabal variables like 'auto%';
select @@global.autocommit;

-- 设置系统变量
set session autocommit = 0;
insert into course(id, name) values (5, 'Oracle');
set global auto commit = 0;
```

**注意：**

- 如果没有指定 session / global，默认 session，会话变量
- mysql 服务器重启之后，所设置的全局参数会失效，要想不失效，需要更改/etc/my.cnf 中的配置。

##### 用户定义变量

① 用户定义变量 是用户根据需要自己定义的变量，用户变量不用提前声明，在用的时候直接用“@变量名”使用就可以。其作用域为当前连接。

② 赋值：

```sql
SET @var name = expr [, @var_name = expr]...;
SET @var name := expr [, @var_name := expr]...;

SELECT @var name := expr , @var name := expr ...;
SELECT 字段名 INTO @var_name FROM 表名;
```

③ 使用：

```sql
SELECT @var_name;
```

④ 案例：

```sql
-- 变量：用户变量
-- 赋值
set @myname = 'itcast';
set @myage := 10;

select @mycolor := 'red';
select count(*) into @mycount from tb_user;

-- 使用
select @myname, @myage, @mycolor, @mycount;

select @abc; -- 输出为NULL
```

**注意：**

用户定义的变量无需对其进行声明或者初始化，只不过获取到的值为 NULL。

##### 局部变量

① 局部变量 是根据需要定义的在局部生效的变量，访问之前，需要DECLARE声明。可用作存储过程内的局部变量和输入参数，局部变量的范围是在其内声明的BEGIN .. END块。

② 声明：

```sql
DECLARE 变量名 变量类型 [DEFAULT..];
```

变量类型就是数据库字段类型:INT、BIGINT、CHAR、VARCHAR、DATE、TIME等。

③ 赋值：

```sql
SET 变量名=值;

SET 变量名:=值;

SELECT 字段名 INTO 变量名 FROM 表名 ...;
```

④ 案例：

```sql
-- 变量：局部变量
-- 声明 - declare
-- 赋值 -
create procedure p2()
begin
  declare stu_count int default 0;
  select count(*) into stu_count from student;
  select stu_count;
end;

call p2();
```

#### if 判断

##### 语法：

```sql
IF 条件1 THEN
        ...
ELSEIF 条件2 THEN -- 可选
        ...
ELSE              -- 可选
        ...
END IF;
```

##### 案例：

```sql
create procedure p3()
begin
  declare score int default 58;
  declare result varchar(10);
  if score >= 85 then
    set result :='优秀';
  elseif score >= 60 then
    set result :='及格';
  else
    set result :='不及格';
  end if;
  select result;
end;
```

#### 参数（in, out, inout)

| 类型  | 含义                                         | 备注 |
| ----- | -------------------------------------------- | ---- |
| IN    | 该类参数作为输入，也就是需要调用时传入值     | 默认 |
| OUT   | 该类参数作为输出，也就是该参数可以作为返回值 |      |
| INOUT | 既可以作为输入参数，也可以作为输出参数****   |      |

##### **用法：**

```sql
CREATE PROCEDURE 存储过程名称([IN/OUT/INOUT 参数名 参数类型 ])
BEGIN
    -- SQL语句
END :
```

##### **案例：**

```sql
-- 根据传入(in)参数score，判定当前分数对应的分数等级，并返回(out)
-- score >= 85分，等级为优秀。
-- score >= 60分 且 score < 85分，等级为及格
-- score < 60分，等级为不及格。
create procedure p4(in score int, out result varchar(10))
begin
    if score >= 85 then
        set result := '优秀';
    elseif score >= 60 then
        set result := '及格';
    else
        set result := '不及格';
    end if;
end;

call p4(68,@result);
select @result;

-- 将传入的200分制的分数，进行换算，换算成百分制，然后返回分数 --> inout
create procedure p5(inout score double)
begin
  set score := score * 0.5;
end;

set @score = 198;
call p5(score);
select @score;
```

#### case

##### **语法一：**

```sql
CASE case value
  WHEN when_value1 THEN statement_list1
  [WHEN when_value2 THEN statement_list2]...
  [ELSE statement_list ]
END CASE;
```

##### **语法二：**

```sql
CASE
  WHEN search_conditionl THEN statement_list1
  WHEN search_condition2 THEN statement_list2]...
  [ELSE statement_list]
END CASE;
```

##### **案例：**

```sql
-- case
-- 根据传入的月份，判定月份所属的季节(要求采用case结构)
-- 1-3月份，为第一季度
-- 4-6月份，为第二季度
-- 7-9月份，为第三季度
-- 10-12月份，为第四季度

create procedure p6(in month int)
begin 
  declare result varchar(10);
  case 
    when month >= 1 and month <= 3 then
      set result := '第一季度';
    when month >= 4 and month <= 6 then
      set result := '第二季度';
    when month >= 7 and month <= 9 then
      set result := ' 第三季度';
    when month >= 10 and month <= 12 then
      set result := '第四季度';
    else
      set result := '非法参数';
  end case;

-- concat() 用于字符串的拼接
  select concat('你输入的月份为：', month, '，所属季度为：', result);
end;
```

#### 循环

##### while

① while 循环是有条件的循环控制语句。满足条件后，再执行循环体中的SQL语句。

② 语法：

```sql
-- 先判定条件，如果条件为true，则执行逻辑，否则，不执行逻辑
WHILE 条件 DO
  SQL逻辑...
END WHILE;
```

③ 案例：

```sql
-- while计算从1累加到 n 的值，n 为传入的参数值。
-- A.定义局部变量，记录累加之后的值;
-- B.每循环一次，就会对 n 进行减1，如果 n 减到0，则退出循环

create procedure p7(in n int)
begin
  declare total int default 0;
  
  while n>0 do
    set total := total + n
    set n:=n-1;
  end while;
  
  select total;
end;
call p7(100);
```

##### repeat 

① repeat是有条件的循环控制语句,当满足条件的时候退出循环。

② 语法：

```sql
-- 先执行一次逻辑，然后判定逻辑是否满足，如果满足，则退出。如果不满足，则继续下一次循环
REPEAT
  SQL逻辑.
  UNTIL 条件
END REPEAT;
```

③ 案例：

```sql
-- while计算从1累加到 n 的值，n 为传入的参数值。
-- A.定义局部变量，记录累加之后的值;
-- B.每循环一次，就会对 n 进行减1，如果 n 减到0，则退出循环

create procedure p8(innint)
begin
  declare total int default 0;
  
  repeat
    set total := total + n;
    set n := n - 1;
  until n <= 0
  end repeat;
  
  select total;
end;

call p8(10);
call p8(100);
```

④ 与 while 区别：

- 先进行循环一次再判断。相当于 c 语言中的 do while();
- 满足条件则退出

##### loop

① LOOP 实现简单的循环，如果不在SQL逻辑中增加退出循环的条件，可以用其来实现简单的死循环。LOOP可以配合一下两个语句使用。

- LEAVE:配合循环使用，退出循环。
- ITERATE:必须用在循环中，作用是跳过当前循环剩下的语句，直接进入下一次循环。

② 语法：

```sql
[begin label:] LOOP
  SQL逻辑..
END LOOP [end label];

-- 退出指定标记的循环体
LEAVE label; 
-- 直接进入下一次循环
ITERATE label;
```

③ 案例：

```sql
-- loop 计算从1到n之间的偶数累加的值，n为传入的参数值。
-- A.定义局部变量，记录累加之后的值;
-- B.每循环一次，就会劝进行-1，如果n减到0，则退出循环。------> leave xx
-- C.如果当次累加的数据是奇数，则直接进入下一次循坏。-------> iterate xx

create procedure p10(in n int)
begin 
  declare total int defatult 0;

  sum: loop
    if n <= 10 then
      leave sum;
    end if;

    if n%2 = 1 then
      set n := n - 1;
      iterate sum;
    end if;

    set total := total + n;
    set n := n - 1;
  end loop sum;

  select total;
end;
```

#### 游标-cursor

##### 介绍

游标(CURSOR)是用来存储查询结果集的数据类型,在存储过程和函数中可以使用游标对结果集进行循环的处理。游标的使用包括游标的声明、OPEN、FETCH和 CLOSE，其语法分别如下。

① 声明游标

```sql
DECLARE 游标名称 CURSOR FOR 查询语句;
```

② 打开游标：

```sql
OPEN 游标名称;
```

③ 获取游标记录：

```sql
FETCH 游标名称 INTO 变量[,变量];
```

④ 关闭游标：

```sql
CLOSE 游标名称;
```

##### 案例：

```sql
-- 游标
-- 根据传入的参数uage，来查询用户表tb_user 中， 所有的用户年龄小于uage的用户姓名（name)和专业（profession），
-- 并将用户的姓名和专业插入到所创建的一张新表(id,name,profession)中。
-- 逻辑:
-- A.声明游标，存储查询结果集
-- B.准备:创建表结构
-- C.开启游标
-- D.获取游标中的记录
-- E.插入数据到新表中
-- F.关闭游标

create procedure p11(in uage int)
begin 
  declare uname varchar(100);
  declare upro varchar(100);
  declare u_cursor cursor for select name, profession from tb_user where age <= uage;

  drop table if exists tb_user_pro;
  create table if not exists tb_user_pro(
    id int primary key auto_increment,
    name varchar(100),
    profession varchar(100)
  );
  
  open u_cursor;
  while true do
    fetch u_cursor into uname,upro;
    insert into tb_user_pro values(null, uname, upro);
  end while;
  close u_cursor;
end;
```

#### 条件处理程序-handler

① 条件处理程序(Handler)可以用来定义在流程控制结构执行过程中遇到问题时相应的处理步骤。

② 语法：

```sql
DECLARE handler action HANDLERFOR condition value l, condition value.... statement;
handler action
  CONTINUE: 继续执行当前程序
  EXIT: 终止执行当前程序
condition value
  SOLSTATE sqlstate_value:状态码，如 02000
  SQLWARNING:所有以01开头的SQLSTATE代码的简写
  NOT FOUND:所有以02开头的SOLSTATE代码的简写
  SOLEXCEPTION:所有没有被SOLWARNING 或 NOT FOUND捕获的SOLSTATE代码的简写
```

③ 案例：

```sql
create procedure p11(in uage int)
begin 
  declare uname varchar(100);
  declare upro varchar(100);
  declare u_cursor cursor for select name, profession from tb_user where age <= uage;
  
  -- 监控到02000的状态码后，关闭游标后执行exit退出操作。
  declare exit handler for not found close u_cursor; 

  drop table if exists tb_user_pro;
  create table if not exists tb_user_pro(
    id int primary key auto_increment,
    name varchar(100),
    profession varchar(100)
  );
  
  open u_cursor;
  while true do
    fetch u_cursor into uname,upro;
    insert into tb_user_pro values(null, uname, upro);
  end while;
  close u_cursor;
end;
```

### 存储函数：

#### 1. 介绍：

存储函数是有返回值的存储过程，存储函数的参数只能是IN类型的。存储函数用的较少，能够使用存储函数的地方都可以用存储过程替换。

#### 2. 语法：

```sql
CREATE FUNCTION 存储函数名称([ 参数列表 ])
RETURNS type [characteristic ...]
BEGIN
  -- SQL语句
  RETURN ...;
END ;
characteristic说明:
· DETERMINISTIC:相同的输入参数总是产生相同的结果
· NO SQL:不包含 SQL语句。
· READS SOL DATA:包含读取数据的语句，但不包含写入数据的语句,
```

#### 3. **案例：**

```sql
create function fun1(n int)
returns int deterministic
begin
    declare total int default 0;
     while n>0 do
        set total := total + n;
        set n:= n - 1;
     end while;

    return total;
end;

select fun1(100);
```

### 触发器

#### 1. 介绍

(1) 触发器是与表有关的数据库对象，指在 insert/update/delete 之前或之后，触发并执行触发器中定义的SQL语句集合。触发器的这种特性可以协助应用在数据库端确保数据的完整性，日志记录，数据校验等操作。

(2) 使用别名 OLD 和 NEW 来引用触发器中发生变化的记录内容，这与其他的数据库是相似的。现在触发器还只支持行级触发，不支持语句级触发。

| 触发器类型      | NEW 和 OLD                                             |
| --------------- | ------------------------------------------------------ |
| insert 型触发器 | NEW 表示将要或者已经新增的数据                         |
| update 型触发器 | OLD 表示修改之前的数据，NEW 表示将要或已经修改后的数据 |
| delete 型触发器 | OLD 表示将要或者已经删除的数据                         |

#### 2. **语法：**

**创建：**

```sql
CREATE TRIGGER trigger name
BEFORE/AFTER INSERT/UPDATE/DELETE
ON tbl name FOR EACH ROW --行级触发器BEGIN
  trigger_stmt;
END;
```

**查看：**

```sql
SHOW TRIGGERS;
```

**删除：**

```sql
DROP TRIGGER [schema_name.]trigger_name; --如果没有指定 schema name，默认为当前数据库
```

**案例：**

```sql
-- 插入数据触发器
create trigger tb_user_insert_trigger
  after insert on tb_user for each row
  begin 
  insert into user_logs(id, operation, operate_time, operate_id, operate_params)values
  (null, 'insert', now(), new.id, concat('插入的数据内容为：id=', new.id, ',name=', new.name, ', phone=', new.phone, ', email=', new.email, ', profession=', new.profession));
end;

-- 查看
show triggers;

-- 删除
drop trigger tb_user_insert_trigger;

-- 插入数据tb_user
insert into tb_user(id, name, phtone, email, profession, age, gender, status, createtime) values(25, '二皇子', '1880901212', 'erhuangzi@163.com', '软件工程', 23, '1', '1'1, now());

-- 修改数据触发器
create trigger tb_user_update_trigger
  after update on tb_user for each row
  begin 
  insert into user_logs(id, operation, operate_time, operate_id, operate_params)values
  (null, 'update', now(), new.id, 
   concat('更新之前的数据：id=', old.id, ',name=', old.name, ', phone=', old.phone, ', email=', old.email, ', profession=', old.profession,
    '更新之后的数据：id=', new.id, ',name=', new.name, ', phone=', new.phone, ', email=', new.email, ', profession=', new.profession));
end;

update tb_user set age = 32 where id = 23;
update tb_user set age = 32 where id <= 5; -- 触发器为行级触发器，所以更改几行数据则触发几次，该语句触发5次

-- 删除数据触发器
create trigger tb_user_delete_trigger
  after delete on tb_user for each row
  begin 
  insert into user_logs(id, operation, operate_time, operate_id, operate_params)values
  (null, 'insert', now(), old.id, 
   concat('删除之前的数据：id=', new.id, ',name=', old.name, ', phone=', old.phone, ', email=', old.email, ', profession=', old.profession));
end;

delete from tb_user where id = 26;
```

### 锁

#### 介绍

锁是计算机协调多个进程或线程并发访问某一资源的机制。在数据库中，除传统的计算资源(CPU、RAM、I/0)的争用以外，数据也是一种供许多用户共享的资源。如何保证数据并发访问的一致性、有效性是所有数据库必须解决的一个问题，锁冲突也是影响数据库并发访问性能的一个重要因素。从这个角度来说，锁对数据库而言显得尤其重要，也更加复杂。

#### 分类

MySQL中的锁，按照锁的粒度分，分为一下三类：

- 全局锁：锁定数据库中的所有表。
- 表级锁：每次操作锁住整张表。
- 行级锁：每次操作锁住对应的行数据。

### 全局锁

#### 介绍

① 全局锁就是对整个数据库实例加锁，加锁后整个实例就处于只读状态，后续的DML的写语句，DDL语句，已经更新操作的事务提交语句都将被阻塞。

② 其典型的使用场景是做全库的逻辑备份，对所有的表进行锁定，从而获取一致性视图，保证数据的完整性。

#### 演示图

<img src="https://i-blog.csdnimg.cn/direct/263d8ef5e1364dbb84d1068f3b89b0f7.png" alt="img" style="zoom: 67%;" />

<img src="https://i-blog.csdnimg.cn/direct/e8ba5de5b7ce4b26bdfcc9a4423b8ccc.png" alt="img" style="zoom:67%;" />

#### 基本操作

① 使用全局锁：

```sql
flush tables with read lock
```

② 释放全局锁：

```sql
unlock tables
```

#### 特点：

数据库中加全局锁，是一个比较重的操作，存在以下问题:

- 如果在主库上备份，那么在备份期间都不能执行更新，业务基本上就得停摆
- 如果在从库上备份，那么在备份期间从库不能执行主库同步过来的二进制日志(binlog)，会导致主从延迟。（该结构会在后续主从复制讲解）

#### 解决方法：

在InnoDB引擎中，我们可以在备份时加上参数 –single-transaction 参数来完成不加锁的一致性数据备份。

```bash
mysqldump --single-transaction -uroot -p123456 itcast > itcast.sql
```

**注意：**

这个方法**只对 InnoDB 引擎有用**（因为只有 InnoDB 支持事务）；如果是 MyISAM 引擎，备份还是会锁表（MyISAM 不支持事务，没法搞 “快照”）。

### 表级锁

#### 介绍

每次操作锁住整张表。锁定粒度大，发生锁的冲突的概率最高，并发度最低。应用在MyISAM、InnoDB、BDB等存储引擎中。对于表级锁，主要分为一下三类：

- 表锁
- 元数据锁（meta data lock，MDL）
- 意向锁

#### 表锁

① 对于表锁，分为两类：

- 表共享读锁（read lock）
- 表独占写锁（write lock）

**读锁不会阻塞其他客户端的读，但是会阻塞写。写锁既会阻塞其他客户端的读，又会阻塞其他客户端的写。**

② 语法：

```bash
#表级别的共享锁，也就是读锁；
#允许当前会话读取被锁定的表，但阻止当前会话和其他会话对这些表进行写操作。
lock tebles t_student read;

#表级锁的独占锁，也是写锁；
#允许当前会话对表进行读写操作，但阻止其他会话对这些表进行任何操作（读或写）。
lock tables t_stuent write;

#会话退出，也会释放所有锁
unlock tables
```

#### 元数据锁

① MDL加锁过程是系统自动控制，无需显式使用，在访问一张表的时候会自动加上。MDL锁主要作用是维护表元数据的数据一致性，在表上有活动事务的时候，不可以对元数据进行写入操作。**为了避免DML与DDL冲突，保证读写的正确性。**

- 对一张表进行 CRUD（增删改查）操作时，加的是 **MDL 读锁**；
- 对一张表做结构变更操作的时候，加的是 **MDL 写锁**；

| 对应SQL                                     | 锁类型                                | 说明                                             |
| ------------------------------------------- | ------------------------------------- | ------------------------------------------------ |
| lock tables xxx read /write                 | SHARED_READ_ONLY/SHARED_NO_READ_WRITE |                                                  |
| select 、 select … lock in share mode       | SHARED_READ                           | 与SHARED_READ、SHARED_WRITE兼容，与EXCLUSIVE互斥 |
| insert 、update、delete、select …for update | SHARED_WRITE                          | 与SHARED_READ、SHARED_WRITE兼容，与EXCLUSIVE互斥 |
| alter table …                               | EXCLYSIVE                             | 与其他的MDL都互斥                                |

② 查看元数据锁

```sql
select object_type,object_schema,object_name,lock_type,lock_duration from performance_schema.metadata_locks;
```

#### 意向锁

(1) 为什么需要意向锁？

若没有意向锁，加**表锁**时需要**逐行检查表中所有记录是否有行锁**（比如表有 10 万行，需检查 10 万次），效率极低。

(2) 核心类比

把数据库表比作「教室」，表中每一行比作「座位」：

- 行锁 = 占某个座位；
- 意向锁 = 教室门口贴的纸条（提示 “教室内已有座位被占用”）；
- 表锁 = 锁整个教室（要求教室内无任何占座）。

(3) 意向共享锁和意向独占锁是表级锁，不会和行级的共享锁和独占锁发生冲突，而且意向锁之间也不会发生冲突，只会和**共享表锁（lock tables … read)和独占表锁（lock tables … write）**发生冲突

① 意向共享锁（IS）：与表锁共享锁（read）兼容，与表锁排它锁（write）互斥。

② 意向排他锁（IX）：与表锁共享锁（read）及排它锁（write）都互斥。

(4) 加锁方式：

```sql
-- 意向共享锁：（先在表上加上意向共享锁，然后对读取的记录加共享锁）
select ... lock in share mode

-- 意向独占锁：（先表上加上意向独占锁，然后对读取的记录加独占锁）
insert、update、delete、select ... for update

-- 可以通过以下SQL，查看意向锁及行锁的枷锁情况
select object_schema,object_name,index_name,lock_type,lock_mode,lock_data from performance_schema.data_locks;
```

### 行级锁

行级锁，每次操作锁住对应的行数据。锁定粒度最小，发生锁冲突的概率最低，并发度最高。应用在InnoDB存储引擎中。

- 行锁(Record Lock):锁定单个行记录的锁，防止其他事务对此行进行update和delete。在RC、RR隔离级别下都支持。
- 间隙锁(GapLock):锁定索引记录间隙(不含该记录)，确保索引记录间隙不变，防止其他事务在这个间隙进行insert，产生幻读。在RR隔离级别下都支持。
- 临键锁(Next-Key Lock):行锁和间隙锁组合，同时锁住数据，并锁住数据前面的间隙Gap。在RR隔离级别下支持。

#### Record Lock（行锁）

Record Lock 称为记录锁，锁住的是一条记录。而且记录锁是有 S 锁和 X 锁之分。

(1) InnoDB实现了以下两种类型的行锁：

- 共享锁(S)：允许一个事务去读一行，阻止其他事务获得相同数据集的排它锁。
- 排他锁(X)：允许获取排他锁的事务更新数据，阻止其他事务获得相同数据集的共享锁和排他锁。

|            | S (共享锁) | X (排他锁) |
| ---------- | ---------- | ---------- |
| S (共享锁) | 兼容       | 冲突       |
| X (排他锁) | 冲突       | 冲突       |

(2) 行锁类型：

| SQL                         | 行锁类型   | 说明                                     |
| --------------------------- | ---------- | ---------------------------------------- |
| insert，update，delete …    | 排他锁     | 自动加锁                                 |
| select                      | 不加任何锁 |                                          |
| select … lock in share mode | 共享锁     | 需要手动select之后加上lock in share mode |
| select … for update         | 排他锁     | 需要手动在select之后for update           |

(3) 默认情况下，InnoDB在 REPEATABLE READ事务隔离级别运行，InnoDB使用 next-key锁进行搜索和索引扫描，以防止幻读。

- 针对唯一索引进行检索时，对已存在的记录进行等值匹配时，将会自动优化为行锁。
- InnoDB的行锁是针对于索引加的锁，不通过索引条件检索数据，那么!nnoDB将对表中的所有记录加锁，此时 **就会升级为表锁**。

(4) 查看意向锁及行锁的加锁情况：

```sql
select object_schema,object_name,index_name,lock_type,lock_mode,lock_data from performance_schema.data_locks;
```

#### Gap Lock（间隙锁）

(1) Gap Lock 称为间隙锁，只存在于可重复读隔离级别，目的是为了解决可重复读隔离级别下幻读的现象。

(2) 假设，表中有一个范围 id 为（3，5）间隙锁，那么其他事务就无法插入 id = 4 这条记录了，这样就有效的防止幻读现象的发生。

<img src="https://i-blog.csdnimg.cn/direct/afdb685a0d8f40b6b4c276eeda5cffda.png" alt="img" style="zoom:67%;" />

间隙锁虽然存在 X 型间隙锁和 S 型间隙锁，但是并没有什么区别，间隙锁之间是兼容的，即两个事务可以同时持有包含共同间隙范围的间隙锁，并不存在互斥关系，因为间隙锁的目的是防止插入幻影记录而提出的。

#### Next-Key Lock（临键锁）

(1) Next-Key Lock 称为临键锁，是 Record Lock + Gap Lock 的组合，锁定一个范围，并且锁定记录本身。

(2) 假设，表中有一个范围 id 为（3，5] 的 next-key lock，那么其他事务即不能插入 id = 4 记录，也不能修改 id = 5 这条记录。

<img src="https://i-blog.csdnimg.cn/direct/3b2b07bb049943ecb3cc2b16df5d36af.png" alt="img" style="zoom:67%;" />

(3) 所以，next-key lock 既能保护该记录，又能阻止其他事务将新纪录插入到被保护记录前面的间隙中。

#### 结论

默认情况下，InnODB在 REPEATABLE READ事务隔离级别运行，InnoDB使用 next-key 锁进行搜索和索引扫描，以防止幻读。

- 索引上的等值查询(唯一索引)，给不存在的记录加锁时,优化为间隙锁 。
- 索引上的等值查询(普通索引)，向右遍历时最后一个值不满足查询需求时，next-keylock退化为间隙锁。
- 索引上的范围查询(唯一索引)–会访问到不满足条件的第一个值为止。

### InnoDB引擎

#### 逻辑存储结构

<img src="https://i-blog.csdnimg.cn/direct/8ad74d01b3e9492e8784ad3d340aac53.png" alt="img" style="zoom: 67%;" />

(1) 表空间（对应 ibd 文件）

MySQL 实例级的存储容器，一个 MySQL 实例可以对应多个表空间，用于存储表的记录、索引等数据。

(2) 段（Segment）

① 是表空间的下一级结构，用于管理**多个区**；

② 分类：

- 数据段（Leaf node segment）：对应 B + 树的**叶子节点**
- 索引段（Non-leaf node segment）：对应 B + 树的**非叶子节点**；
- 回滚段（Rollback segment）：用于事务回滚相关的版本管理。

(3) 区（Extent）

表空间的单元结构，每个区的大小为 1MB，默认 InnoDB 页大小为 16KB，因此 1 个区包含 `1MB ÷ 16KB = 64个连续的页`。

(4) 页（Page）

① InnoDB 存储引擎**磁盘管理的最小单元，**每个页的大小默认 16KB；

② 为了保证页的物理连续性，InnoDB 存储引擎每次会从磁盘**一次性申请 4-5 个区**。

(5) 行

① InnoDB 的数据是按 “行” 为单位存放的；

② 行的隐藏列（事务相关）：

- `trx_id`：事务 ID，每次修改记录时，会将对应事务的 ID 存入`trx_id`隐藏列；
- `roll_pointer`（回滚指针）：修改记录时，会把数据的旧版本写入 undo 日志；回滚指针相当于 “指针”，可通过它找到记录修改前的信息。

#### 整体架构

<img src="https://i-blog.csdnimg.cn/direct/fe3c6b967dd34815b4492a7135522248.png" alt="img" style="zoom:67%;" />

#### 内存架构

<img src="https://i-blog.csdnimg.cn/direct/4d3dc91fb6e541f28842497290f98fcf.png" alt="img" style="zoom:67%;" />

(1) Buffer Pool：

① 缓冲池是内存中的一个区域，它可以缓存磁盘上经常操作的真实数据，在执行增删改查操作时，先操作缓冲中的数据（若缓冲池没有数据，则从磁盘加载并缓存），然后以一定频率刷新到磁盘，从而减少磁盘 IO，加快处理速度。

② 缓冲池以 Page 为单位，采用链表数据结构管理 Page。根据状态，将 Page 分为三种类型：

- free page：空的 page，未被使用。
- clean page：被使用 page，数据没有被修改过。
- dirty page：脏页，被使用 page，数据被修改过，也就是缓冲与磁盘的数据产生了不一致。

(2) Change Buffer：

① 更改缓存（针对于非唯一二级索引使用），在执行 DML 语句时，如果该数据 Page 没有在 Buffer Pool 里，不会直接把磁盘进行操作，而会将变更暂存在更改缓存区 Change Buffer 中，在未来数据被读取时，再将数据合并并更新到 Buffer Pool，再将合并后的数据刷新到磁盘中。

② 与主键索引不同，二级索引通常是非唯一的，并且以相对随机的顺序插入二级索引，同样，删除和更新可能会影响索引中不相邻的二级索引页，如果每一次都操作磁盘，会造成大量的随机 IO，有了 ChangeBuffer 之后，我们可以在缓存池中进行合并处理，减少磁盘 IO。

(3) Adaptive Hash Index：

① 自适应 hash 索引，用于优化对 Buffer Pool 数据的查询。InnoDB 存储引擎会监控对表上各索引页的查询，如果观察到 hash 索引可以提升速度，则建立 hash 索引，称之为自适应 hash 索引。

② 自适应哈希索引，无需人工干预，是系统根据情况自动完成。

(4) Log Buffer：

① 日志缓冲区，用来保存要写入到磁盘中的 log 日志数据（redo log、undo log）。默认大小为 16MB，日志缓冲区的日志会定期刷新到磁盘中。如果需要更新、插入或删除许多行的事务，增加日志缓冲区的大小可以节省磁盘 I/O。

② 参数：

- Innodb_log_buffer_size：缓冲区大小
- innodb_flush_log_at_trx_commit：日志刷新到磁盘时机

1: 日志在每次事务提交时写入并刷新到磁盘

0: 每秒将日志写入并刷新到磁盘一次

2: 日志在每次事务提交后写入，并每秒刷新到磁盘一次

#### 磁盘结构

<img src="https://i-blog.csdnimg.cn/direct/d075202d7ad24e87a49ccb16583a8ef6.png" alt="img" style="zoom: 67%;" />

(1) System Tablespace：

① 是更改缓冲区的存储区域；若表创建在该空间（而非单表 / 通用表空间），还会包含表、索引数据。(在 MySQL5.x 版本中还包含 InnoDB 数据字典、undolog 等)

② 参数：innodb_data_file_path

(2) File-Per-Table Tablespaces：

① 每个表的文件表空间包含单个 InnoDB 表的数据和索引，并存储在文件系统上的单个数据文件中。

② 参数：innodb_file_per_table

(3) General Tablespaces：通用表空间

① 创建通用表空间：

```sql
CREATE TABLESPACE xxx ADD DATAFILE 'file_name' ENGINE = engine_name;
```

② 对应表创建语句：

```sql
CREATE TABLE xxx ... TABLESPACE ts_name;
```

(4) Undo Tablespaces：

撤销表空间，MySQL 在实例初始化时会自动创建两个默认的 undo 表空间（初始大小 16MB），用于存储 undo log 日志。

(5) Temporary Tablespaces：

InnoDB 使用设备临时表空间和全局临时表空间，存储用户创建的临时表等数据。

(6) Doublewrite Buffer Files：

① 双写缓冲，InnoDB 引擎将数据页从 Buffer Pool 刷新到磁盘前，先将数据页写入双写缓冲文件中，便于系统异常时恢复数据。

② 示例文件：

- `#ib_16384.0.dblwr`
- `#ib_16384.1.dblwr`

(7) Redo Log：

① 重做日志，是用来实现事务的持久性。该日志文件由两部分组成：重做日志缓冲（redo log buffer）以及重做日志文件（redo log）。前者是在内存中，后者在磁盘中。当事务提交之后会把所有修改信息都存到该日志中，用于在数据页写到磁盘时发生错误时，进行数据恢复使用。

② 以循环方式写入重做日志文件，涉及两个文件：

- `ib_logfile0`
- `ib_logfile1`

#### 后台线程

![img](https://i-blog.csdnimg.cn/direct/c5ec1a62d0b34c06b01475e53ad76645.png)

#### 事务原理

(1) 事务：一组操作的集合，它是一个不可分割的工作单位，事务会把所有的操作作为一个整体一起向系统提交或撤销操作请求，即这些操作要么同时成功，要么同时失败。

(2) 特征：

- 原子性(Atomicity)：事务是不可分割的最小操作单元，要么全部成功，要么全部失败。
- 一致性(Consistency) ：事务完成时，必须使所有的数据都保持一致状态。
- 隔离性(lsolation)：数据库系统提供的隔离机制，保证事务在不受外部并发操作影响的独立环境下运行。
- 持久性(Durability)：事务一旦提交或回滚，它对数据库中的数据的改变就是永久的。

(3) 特性原理分类图：

<img src="https://i-blog.csdnimg.cn/direct/f7df936e48484d639d06ca933668e7f0.png" alt="img" style="zoom:67%;" />

#### redo log

(1) 重做日志，记录的是事务提交时数据页的物理修改，是用来实现事务的**持久性**。

(2) 该日志文件由两部分组成:重做日志缓冲(redo log buffer)以及重做日志文件(redo log file),前者是在内存中，后者在磁盘中。当事务提交之后会把所有修改信息都存到该日志文件中,用于在刷新脏页到磁盘,发生错误时,进行数据恢复使用。

(3) Buffer Pool在产生脏页数据的时候，会先将数据存储到 redo log buffer 再存储到 redo log 中进行磁盘持久化存储，在内存出现异常（比如突然断电）时，通过redo log中持久化的数据进行回滚。过程如下图：

![img](https://i-blog.csdnimg.cn/direct/062527b6023940f0b108036edadb9159.png)

(4) redo log 分为 2 部分：

- 内存里的「redo log 缓冲」：临时存一下修改记录（相当于 “草稿纸”）；
- 磁盘里的「redo log 文件」：长期存修改记录（相当于 “正式笔记本”）。

(5) 工作流程像这样：

比如你修改了一条数据 → 先把 “我改了啥、怎么改的” 记到「redo log 缓冲」里 → 事务提交时，把缓冲里的记录写到「redo log 文件」里 → 之后数据库再慢慢把修改好的数据（存在内存缓存里的 “脏数据”）刷到磁盘。

要是中途突然断电：重启后，数据库会看「redo log 文件」里的记录，把没来得及刷到磁盘的修改，重新恢复出来。

Q：redo log 要写到磁盘，数据也要写磁盘，为什么要多此一举?

A：redo log 是 ”顺序写“，**磁盘处理起来特别快；**而直接写数据是 ”随机写“，得先找到数据在磁盘里的位置，再修改，**速度很慢。**

#### undo log

(1) 回滚日志，用于记录数据被修改前的信息，作用包含两个：提供回滚 和 MVCC(多版本并发控制)。

(2) undo log 和 redo log 记录物理日志不一样，它是逻辑日志。可以认为当 delete 一条记录时，undo log中会记录一条对应的insert记录，反之亦然，当 update 一条记录时，它记录一条对应相反的 update 记录。当执行 rollback 时，就可以从 undo log 中的逻辑记录读取到相应的内容并进行回滚。

(3) Undo log 销毁：undo log 在事务执行时产生，事务提交时，并不会立即删除undol0g，因为这些日志可能还用于 MVCC。

(4) Undo log 存储：undo log 采用段的方式进行管理和记录，存放在前面介绍的 rollback segment 回滚段中，内部包含1024个 undo log segment.

### MVCC

#### 当前读：

读取的是记录的最新版本，读取时还要保证其他并发事务不能修改当前记录，会对读取的记录进行加锁。对于我们日常的操作，如：select…lock in share mode(共享锁)，select… for update、update、insert、delete(排他锁)都是一种当前读。

#### 快照读：

简单的select(不加锁)就是快照读，快照读，读取的是记录数据的可见版本，有可能是历史数据，不加锁，是非阻塞读。

- Read committed:每次select，都生成一个快照读。
- Repeatable Read:开启事务后第一个select语句才是快照读的地方。
- Serializable:快照读会退化为当前读。

#### MVCC：

全称 Multi-Version Concurrency Control，多版本并发控制。指维护一个数据的多个版本，使得读写操作没有冲突，快照读为 MVSQL 实现MVCC提供了一个非阻塞读功能。MVCC的具体实现，还需要依赖于数据库记录中的三个隐式字段、undo log日志、read View。

#### 三个隐藏字段

![img](https://i-blog.csdnimg.cn/direct/e7dccccd8d3449919946f93ec08cb8e0.png)

#### undo log

(1) 回滚日志，在insert、update、delete的时候产生的便于数据回滚的日志。

(2) 当insert的时候，产生的undolog日志只在回滚时需要，在事务提交后，可被立即删除。

(3) 而update、delete的时候，产生的undo log日志不仅在回滚时需要，在快照读时也需要，不会立即被删除。

(4) 那么何时删除？

**① 事务提交后**：

- 对于`INSERT`操作，事务提交后，undo log可以被立即删除，因为不再需要用于回滚。例如：你新增了一条 “订单记录”，事务提交后，既不需要回滚（回滚是删这条记录，但提交了就不用回滚了），也不会有其他事务需要读这条记录的 “旧版本”（因为它是刚新增的，没有更早的版本），所以 undo log 没用了，直接删。

**Q：**为什么说没有旧版本？旧版本不是没有插入之前的吗？

**A：**这里的旧版本指的是 **“这条新插入记录本身的旧版本” ，**不是 ”表在插入前的状态“，可以理解成行锁和表锁的关系。

- 对于`UPDATE`和`DELETE`操作，undo log不会立即被删除，因为它们可能在后续的快照读取中被使用。例如：你把 “订单金额从 100 改成 200”，事务提交后，可能有其他事务需要看 “金额 100” 这个旧版本（比如查 5 分钟前的订单状态），这时候得靠 undo log 调出旧数据，所以它还能用，得留着。

**② 快照读取结束**：

- 当所有依赖于该undo log的快照读取操作结束后，undo log才会被删除。这意味着如果有一个事务正在进行快照读取，并且依赖于某个undo log，那么这个undo log会一直保留直到该事务结束。

(5) undo log 版本链

![img](https://i-blog.csdnimg.cn/direct/882379e7ae654122b9f2c62ccfc3b7f6.png)

#### readview

(1) ReadView(读视图)是 快照读 SOL执行时MVCC提取数据的依据，记录并维护系统当前活跃的事务(未提交的)id。

(2) ReadView中包含了四个核心字段:

| 字段           | 含义                                                        |
| -------------- | ----------------------------------------------------------- |
| m_ids          | 当前活跃的事务ID集合                                        |
| min_trx_id     | 最小活跃事务ID                                              |
| max_trx_id     | 预分配事务ID，当前最大事务ID+1（因为事务ID是自增的）        |
| creator_trx_id | ReadView创建者的事务ID（即 “当前要读数据的那个事务” 的 ID） |

(3) 版本链数据访问规则

![img](https://i-blog.csdnimg.cn/direct/9c1af48f75304a2a943b15bd678e7518.png)

① 规则 1：（trx_id = creator_trx_id → 能访问）：

这里的`creator_trx_id`就是表格里的 “ReadView 创建者的事务 ID”—— 如果某数据版本的修改者 ID，和 “当前读数据的事务 ID” 一致，说明是自己改的，能访问。

② 规则 2：（trx_id < min_trx_id → 能访问）：

`min_trx_id`是 “最小活跃事务 ID”—— 如果某数据版本的修改者 ID，比 “当前最小编号的活跃事务” 还小，说明这个修改事务**早于所有活跃事务完成提交**，能访问。

③ 规则 3：（trx_id > max_trx_id → 不能访问）：

`max_trx_id`是 “预分配事务 ID（当前最大 ID+1）”—— 如果某数据版本的修改者 ID，比这个预分配 ID 还大，说明这个修改事务是**在 ReadView 创建之后才启动的**（事务 ID 自增），还没完成，不能访问。

④ 规则 4：（min_trx_id ≤ trx_id ≤ max_trx_id 且 trx_id 不在 m_ids 里 → 能访问）：

- `min_trx_id`/`max_trx_id`限定了 “当前活跃事务的 ID 范围”；
- `m_ids`是 “当前活跃的事务 ID 集合”—— 如果某数据版本的修改者 ID 在这个范围内，但**不在活跃集合里**，说明这个修改事务**已经提交了**（从活跃状态变成已完成），能访问。

(4) 原理分析（RC 级别）

![img](https://i-blog.csdnimg.cn/direct/9c42739188d747f5bb20152ecd89a033.png)

之所以事务3，事务4都是活跃事务，是因为这个表格执行顺序是从上至下的，在事务5 第一次查询 id 为 30 的记录时，事务3 和 事务4 都没有结束。在事务5 第二次查询 id 为 30 的记录时，事务3 已经结束了

(5) 原理分析（RR 级别）

![img](https://i-blog.csdnimg.cn/direct/3299357e62ec49019f4ea81f204354a9.png)

### MySQL 管理

#### 系统数据库介绍

Mysql数据库安装完成后，自带了一下四个数据库，具体作用如下：

| 数据库             | 含义                                                         |
| ------------------ | ------------------------------------------------------------ |
| mysql              | 存储MySQL服务器正常运行所需要的各种信息(时区、主从、用户、权限等) |
| information_schema | 提供了访问数据库元数据的各种表和视图，包含数据库、表、字段类型及访问权限等 |
| performance_schema | 为MySQL服务器运行时状态提供了一个底层监控功能，主要用于收集数据库服务器性能参数 |
| sys                | 包含了一系列方便 DBA和开发人员利用 performance_schema性能数据库进行性能调优和诊断的视图 |

#### 常用工具

(1) mysql 

![img](https://i-blog.csdnimg.cn/direct/c4af0fe5796b42438e2ffb2ad455c2b8.png)

(2) mysqladmin

<img src="https://i-blog.csdnimg.cn/direct/af2f98362d6143c39eb902929cfd8788.png" alt="img" style="zoom: 50%;" />

(3) mysqlbinlog

<img src="https://i-blog.csdnimg.cn/direct/e245ad00b24943978098f2d0a2db2ebd.png" alt="img" style="zoom:50%;" />

(4) mysqlshow

<img src="https://i-blog.csdnimg.cn/direct/364094db1aed4712a8b621c9d448f80c.png" alt="img" style="zoom:50%;" />

(5) mysqldump

![img](https://i-blog.csdnimg.cn/direct/d2b62139795f498cafc2f31406cb8191.png)

(6) mysqlimport / source

![image-20260329115110609](C:\Users\24539\AppData\Roaming\Typora\typora-user-images\image-20260329115110609.png)