---
title: Redis学习笔记之基础篇
date: 2026-03-29 10:00:00
categories:
  - Redis
tags:
  - Redis
cover: /img/redis-jichu.jpg
---

## Redis 学习笔记

## 基础篇

### 认识 Redis

#### 认识 NoSQL

**NoSql**可以翻译做Not Only Sql（不仅仅是SQL），或者是No Sql（非Sql的）数据库。是相对于传统关系型数据库而言，有很大差异的一种特殊的数据库，因此也称之为**非关系型数据库**。

##### 结构化与非结构化

① 传统关系型数据库是结构化数据，每一张表都有严格的约束信息：字段名、字段数据类型、字段约束等等信息，插入的数据必须遵守这些约束：

<img src="https://i-blog.csdnimg.cn/direct/c8ad967fc1734e80bc9adab8b8a604cb.png" alt="img" style="zoom:67%;" />

② 而NoSql则对数据库格式没有严格约束，往往形式松散，自由。可以是键值型、文档型、图格式。

##### 关联和非关联

① 传统数据库的表与表之间往往存在关联，例如外键：

<img src="https://i-blog.csdnimg.cn/direct/8b96f79e34c64b37b7e874ad06488e7b.png" alt="img" style="zoom:67%;" />

② 而非关系型数据库不存在关联关系，要维护关系要么靠代码中的业务逻辑，要么靠数据之间的耦合：

```javascript
{
  id: 1,
  name: "张三",
  orders: [
    {
       id: 1,
       item: {
	 id: 10, title: "荣耀6", price: 4999
       }
    },
    {
       id: 2,
       item: {
	 id: 20, title: "小米11", price: 3999
       }
    }
  ]
}
```

##### 查询方式

① 传统关系型数据库会基于Sql语句做查询，语法有统一标准；

② 不同的非关系数据库查询语法差异极大，五花八门各种各样。

 <img src="https://i-blog.csdnimg.cn/direct/4f64291d2f4e48149e7f0f1e468474f6.png" alt="img" style="zoom:67%;" />

##### 事务

① 传统关系型数据库能满足事务ACID的原则。

<img src="https://i-blog.csdnimg.cn/direct/c68341ed67d14a6d96f5e14c8915f1f1.png" alt="img" style="zoom:67%;" />

② 而非关系型数据库往往不支持事务，或者不能严格保证ACID的特性，只能实现基本的一致性。

##### 总结

|          | SQL                                                 | NoSQL                                                        |
| -------- | --------------------------------------------------- | ------------------------------------------------------------ |
| 数据结构 | 结构化(Structured)                                  | 非结构化                                                     |
| 数据关联 | 关联的(Relational)                                  | 无关联的                                                     |
| 查询方式 | SQL查询                                             | 非SQL                                                        |
| 事务特性 | ACID                                                | BASE                                                         |
| 存储方式 | 磁盘                                                | 内存                                                         |
| 扩展性   | 垂直                                                | 水平                                                         |
| 使用场景 | 1）数据结构固定  		2)对一致性、安全性要求不高 | 1)数据结构不固定  		2)相关业务对数据安全性、一致性要求较高  		3）对性能要求 |

#### Redis 桌面客户端

(1) Redis安装完成后就自带了命令行客户端：redis-cli，使用方式如下：

```bash
redis-cli [options] [commonds]
```

其中常见的options有：

- `-h 127.0.0.1`：指定要连接的redis节点的IP地址，默认是127.0.0.1
- `-p 6379`：指定要连接的redis节点的端口，默认是6379
- `-a 123321`：指定redis的访问密码

### Redis 常见命令

#### Redis 数据结构

Redis存储的是key-value结构的数据，其中key是字符串类型，value有5中常用的数据类型

- 字符串：String
- 哈希：Hash
- 列表：List
- 集合：Set
- 有序集合：Sorted Set

#### Redis命令-String命令

##### 介绍

String 类型，也就是字符串类型，是Redis中最简单的存储类型。其value是字符串，根据字符串的格式不同，又可以分为3类：

- string：普通字符串
- int：整数类型，可以做自增、自减操作
- float：浮点类型，可以做自增、自减操作

<img src="https://i-blog.csdnimg.cn/direct/656b5c02a88e4a4bb105f8949a489a63.png" alt="img" style="zoom:67%;" />

**说明：**

Redis 没有原生的 “整数类型” “浮点类型” 存储结构，String 类型的所有 value，底层都以 **简单动态字符串（SDS）** 这种字节数组形式存储。

- 表格中 `num` 的 `10`：底层存的是字符 `'1'` 和 `'0'` 的字节，不是编程语言里占 4 字节的整数 10；
- 表格中 `score` 的 `92.5`：底层存的是字符 `'9'` `'2'` `'.'` `'5'` 的字节，不是浮点型的二进制存储；
- 只有格式上的区别，存储本质完全一致。

##### String 的常见命令有：

- SET：添加或者修改已经存在的一个String类型的键值对
- GET：根据key获取String类型的value
- MSET：批量添加多个String类型的键值对
- MGET：根据多个key获取多个String类型的value
- INCR：让一个整型的key自增1
- INCRBY：让一个整型的key自增并指定步长，例如：incrby num 2 让num值自增2
- SETNX：添加一个String类型的键值对，前提是这个key不存在，否则不执行
- SETEX：添加一个String类型的键值对，并且指定有效期

① SET 和 GET：如果key不存在则是新增，如果存在则是修改

```java
127.0.0.1:6379> set name Rose  //原来不存在
OK

127.0.0.1:6379> get name 
"Rose"

127.0.0.1:6379> set name Jack //原来存在，就是修改
OK

127.0.0.1:6379> get name
"Jack"
```

② INCR 和 INCRBY 和 DECY

```java
127.0.0.1:6379> get age 
"10"

127.0.0.1:6379> incr age //增加1
(integer) 11
    
127.0.0.1:6379> get age //获得age
"11"

127.0.0.1:6379> incrby age 2 //一次增加2
(integer) 13 //返回目前的age的值
    
127.0.0.1:6379> incrby age 2
(integer) 15
    
127.0.0.1:6379> incrby age -1 //也可以增加负数，相当于减
(integer) 14
    
127.0.0.1:6379> incrby age -2 //一次减少2个
(integer) 12
    
127.0.0.1:6379> DECR age //相当于 incr 负数，减少正常用法
(integer) 11
    
127.0.0.1:6379> get age 
"11"
```

#### Redis命令-Key的层级结构

##### 存在的问题

需要存储用户、商品信息到redis，有一个用户id是1，有一个商品id恰好也是1，此时如果使用id作为key，那就会冲突了，该怎么办？

##### 解决方案

① Redis的key允许有多个单词形成层级结构，多个单词之间用':'隔开，格式如下：

![img](https://i-blog.csdnimg.cn/direct/c0df58965d294e2e99a740b5d1bec039.png)

② 例如我们的项目名称叫 heima，有user和product两种不同类型的数据，我们可以这样定义key：

- user相关的key：**heima:user:1**
- product相关的key：**heima:product:1**

#### Redis命令-Hash命令

##### 优势

Hash结构可以将对象中的每个字段独立存储，可以针对单个字段做CRUD：

<img src="https://i-blog.csdnimg.cn/direct/ca20e089c0a74eeba0232b9c2522afd2.png" alt="img" style="zoom:67%;" />

##### **Hash类型的常见命令**

- HSET key field value：添加或者修改hash类型key的field的值
- HGET key field：获取一个hash类型key的field的值
- HMSET：批量添加多个hash类型key的field的值
- HMGET：批量获取多个hash类型key的field的值
- HGETALL：获取一个hash类型的key中的所有的field和value
- HKEYS：获取一个hash类型的key中的所有的field
- HINCRBY:让一个hash类型key的字段值自增并指定步长
- HSETNX：添加一个hash类型的key的field值，前提是这个field不存在，否则不执行

① HSET 和 HGET

```java
127.0.0.1:6379> HSET heima:user:3 name Lucy//大key是 heima:user:3 小key是name，小value是Lucy
(integer) 1
127.0.0.1:6379> HSET heima:user:3 age 21// 如果操作不存在的数据，则是新增
(integer) 1
127.0.0.1:6379> HSET heima:user:3 age 17 //如果操作存在的数据，则是修改
(integer) 0
127.0.0.1:6379> HGET heima:user:3 name 
"Lucy"
127.0.0.1:6379> HGET heima:user:3 age
"17"
```

② HKEYS和HVALS

```java
127.0.0.1:6379> HKEYS heima:user:4
1) "name"
2) "age"
3) "sex"
127.0.0.1:6379> HVALS heima:user:4
1) "LiLei"
2) "20"
3) "man"
```

#### Redis命令-List命令

##### 特征

- 有序
- 元素可以重复
- 插入和删除快
- 查询速度一般

##### **List的常见命令**

- LPUSH key element ... ：向列表左侧插入一个或多个元素
- LPOP key：移除并返回列表左侧的第一个元素，没有则返回nil
- RPUSH key element ... ：向列表右侧插入一个或多个元素
- RPOP key：移除并返回列表右侧的第一个元素
- LRANGE key star end：返回一段角标范围内的所有元素
- BLPOP和BRPOP：与LPOP和RPOP类似，只不过在没有元素时等待指定时间，而不是直接返回nil

![img](https://i-blog.csdnimg.cn/direct/c816dcaa45814f9cb54c1e4762e2a203.png)

#### Redis命令-Set命令

##### 特征

- 无序
- 元素不可重复
- 查找快
- 支持交集、并集、差集等功能

##### 常见的命令

| 命令                       | 描述                     |
| -------------------------- | ------------------------ |
| SADD key member1 [member2] | 向集合添加一个或多个成员 |
| SMEMBERS key               | 返回集合中的所有成员     |
| SCARD key                  | 获取集合的成员数         |
| SINTER key1 [key2]         | 返回给定所有集合的交集   |
| SUNION key1 [key2]         | 返回所有给定集合的并集   |
| SDIFF key1 [key2]          | 返回给定所有集合的差集   |
| SREM key member1 [member2] | 移除集合中一个或多个成员 |

<img src="https://i-blog.csdnimg.cn/direct/505e3f58796b475c927a6a18ee9d3013.png" alt="img" style="zoom:67%;" />

#### Redis命令-SortedSet类型

##### 特征

`Sorted Set`有序集合是`String`类型元素的集合，且不允许重复的成员。每个元素都会关联一个`double`类型的分数(`score`) 。`Redis`正是通过分数来为集合中的成员进行从小到大排序。有序集合的成员是唯一的，但分数却可以重复。

##### 常见命令

- ZADD key score member：添加一个或多个元素到sorted set ，如果已经存在则更新其score值
- ZREM key member：删除sorted set中的一个指定元素
- ZSCORE key member : 获取sorted set中的指定元素的score值
- ZRANK key member：获取sorted set 中的指定元素的排名
- ZCARD key：获取sorted set中的元素个数
- ZCOUNT key min max：统计score值在给定范围内的所有元素的个数
- ZINCRBY key increment member：让sorted set中的指定元素自增，步长为指定的increment值
- ZRANGE key min max：按照score排序后，获取指定排名范围内的元素
- ZRANGEBYSCORE key min max：按照score排序后，获取指定score范围内的元素
- ZDIFF、ZINTER、ZUNION：求差集、交集、并集**三、**

### Redis的Java客户端 - Jedis（了解即可）

#### 操作步骤

① 引入依赖

```XML
<!--jedis-->
<dependency>
    <groupId>redis.clients</groupId>
    <artifactId>jedis</artifactId>
    <version>3.7.0</version>
</dependency>
<!--单元测试-->
<dependency>
    <groupId>org.junit.jupiter</groupId>
    <artifactId>junit-jupiter</artifactId>
    <version>5.7.0</version>
    <scope>test</scope>
</dependency>
```

② 建立连接

新建一个单元测试类，内容如下：

```java
private Jedis jedis;

@BeforeEach
void setUp() {
    // 1.建立连接
    // jedis = new Jedis("192.168.150.101", 6379);
    jedis = JedisConnectionFactory.getJedis();
    // 2.设置密码
    jedis.auth("123321");
    // 3.选择库
    jedis.select(0);
}
```

③ 测试

```java
@Test
void testString() {
    // 存入数据
    String result = jedis.set("name", "虎哥");
    System.out.println("result = " + result);
    // 获取数据
    String name = jedis.get("name");
    System.out.println("name = " + name);
}

@Test
void testHash() {
    // 插入hash数据
    jedis.hset("user:1", "name", "Jack");
    jedis.hset("user:1", "age", "21");

    // 获取
    Map<String, String> map = jedis.hgetAll("user:1");
    System.out.println(map);
}
```

④ 释放资源

```java
@AfterEach
void tearDown() {
    if (jedis != null) {
        jedis.close();
    }
}
```

#### Jedis连接池

##### 创建Jedis的连接池

```java
static { // 静态代码块：类加载时自动执行，只执行一次
    // 1. 配置连接池的“规则”
    JedisPoolConfig poolConfig = new JedisPoolConfig();
    poolConfig.setMaxTotal(8);      // 最多同时有 8 个连接（满了就等）
    poolConfig.setMaxIdle(8);       // 最多保留 8 个“空闲”的连接（多余的释放）
    poolConfig.setMinIdle(0);       // 最少保留 0 个空闲连接（没有就新建）
    poolConfig.setMaxWaitMillis(1000); // 没连接时最多等 1000 毫秒（1秒），超时就报错

    // 2. 根据规则，创建真正的连接池
    jedisPool = new JedisPool(
        poolConfig,          // 刚才的规则
        "192.168.150.101",   // Redis 服务器的 IP
        6379,                // Redis 端口
        1000,                // 连接超时时间（毫秒）
        "123321"             // Redis 密码
    );
}

public static Jedis getJedis() { // 对外提供的“借连接”的方法
    return jedisPool.getResource(); // 从连接池里拿一个可用的连接
}
```

### Redis的Java客户端-SpringDataRedis

#### 介绍

SpringDataRedis中提供了RedisTemplate工具类，其中封装了各种对Redis的操作。并且将不同数据类型的操作API封装到了不同的类型中：

<img src="https://i-blog.csdnimg.cn/direct/bcb31babe903442b8add783b2a6b17be.png" alt="img" style="zoom:67%;" />

#### 快速入门

① 需要导入它的maven坐标

```XML
<!--Spring Boot-redis的依赖包-->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
```

② 配置文件

```XML
spring:
  redis:
    host: 192.168.150.101
    port: 6379
    password: 123321
    lettuce:
      pool:
        max-active: 8  #最大连接
        max-idle: 8   #最大空闲连接
        min-idle: 0   #最小空闲连接
        max-wait: 100ms #连接等待时间
```

③ 测试代码

```java
@SpringBootTest
class RedisDemoApplicationTests {

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    @Test
    void testString() {
        // 写入一条String数据
        redisTemplate.opsForValue().set("name", "虎哥");
        // 获取string数据
        Object name = redisTemplate.opsForValue().get("name");
        System.out.println("name = " + name);
    }
}
```

#### 数据序列化器

##### 自定义RedisTemplate的序列化方式，代码如下：

```java
@Configuration
public class RedisConfig {

    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory connectionFactory){
        // 创建RedisTemplate对象
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        // 设置连接工厂
        template.setConnectionFactory(connectionFactory);
        // 创建JSON序列化工具
        GenericJackson2JsonRedisSerializer jsonRedisSerializer = 
            							new GenericJackson2JsonRedisSerializer();
        // 设置Key的序列化
        template.setKeySerializer(RedisSerializer.string());
        template.setHashKeySerializer(RedisSerializer.string());
        // 设置Value的序列化
        template.setValueSerializer(jsonRedisSerializer);
        template.setHashValueSerializer(jsonRedisSerializer);
        // 返回
        return template;
    }
}
```

**说明：**

之所以要写 HashKey 和 HashValue，是因为Redis 里的 `Hash` 类型，就像一个「嵌套的 Map」：

- 顶层结构：`RedisKey（顶层Key） → Hash结构（顶层Value）`
- Hash 内部结构：`HashKey → HashValue`

#### StringRedisTemplate

##### 存在的问题

默认情况下，`RedisTemplate` 使用的序列化器（比如 JdkSerializationRedisSerializer）会把对象的 **完整类信息（class 类型）** 也写入到 JSON 结果中，再存入 Redis。

比如一个 `User` 对象，序列化后可能变成这样：

```XML
{
  "@class": "com.example.User",
  "name": "Jack",
  "age": 21
}
```

这里的 `"@class": "com.example.User"` 就是额外的类信息，它会占用不必要的内存空间。

##### 解决方案

- 先使用`ObjectMapper`把对象手动转换成纯 JSON 字符串（不带 class 信息）。
- 再用 `StringRedisTemplate`把这个 JSON 字符串存入 Redis。
- 读取时，先从 Redis 取出 JSON 字符串，再手动用 Jackson 把它反序列化为对象。

##### 代码实现

```java
@SpringBootTest
class RedisStringTests {

    @Autowired
    private StringRedisTemplate stringRedisTemplate;

    @Test
    void testString() {
        // 写入一条String数据
        stringRedisTemplate.opsForValue().set("verify:phone:13600527634", "124143");
        // 获取string数据
        Object name = stringRedisTemplate.opsForValue().get("name");
        System.out.println("name = " + name);
    }

    private static final ObjectMapper mapper = new ObjectMapper();

    @Test
    void testSaveUser() throws JsonProcessingException {
        // 创建对象
        User user = new User("虎哥", 21);
        // 手动序列化
        String json = mapper.writeValueAsString(user);
        // 写入数据
        stringRedisTemplate.opsForValue().set("user:200", json);

        // 获取数据
        String jsonUser = stringRedisTemplate.opsForValue().get("user:200");
        // 手动反序列化
        User user1 = mapper.readValue(jsonUser, User.class);
        System.out.println("user1 = " + user1);
    }

}
```

#### Hash结构操作

```java
@SpringBootTest
class RedisStringTests {

    @Autowired
    private StringRedisTemplate stringRedisTemplate;

    @Test
    void testHash() {
        stringRedisTemplate.opsForHash().put("user:400", "name", "虎哥");
        stringRedisTemplate.opsForHash().put("user:400", "age", "21");

        Map<Object, Object> entries = stringRedisTemplate.opsForHash().entries("user:400");
        System.out.println("entries = " + entries);
    }
}
```

