---
title: SSM学习笔记之 MyBatis-Plus
date: 2026-03-20 12:00:00
updated: 2026-03-20 12:00:00
categories:
  - SpringBoot
tags:
  - MyBatis-Plus
  - MyBatis
description: MyBatis-Plus 入门、标准 CRUD 与分页
cover: /img/mybatis-plus.jpg
---

### MyBatisPlus入门案例与简介

#### 入门案例

#### 创建Dao接口

```java
@Mapper
public interface UserDao extends BaseMapper<User>{
}
```

#### 编写引导类

```java
@SpringBootApplication
//@MapperScan("com.itheima.dao")
public class Mybatisplus01QuickstartApplication {
    public static void main(String[] args) {
        SpringApplication.run(Mybatisplus01QuickstartApplication.class, args);
    }

}
```

### 标准数据层开发

#### 标准CRUD使用

#### 方法大全

<img src="https://i-blog.csdnimg.cn/direct/96acc94ecfa44510b13dcf36074d6aa0.png" alt="img" style="zoom:67%;" />

#### 新增

#### 语法格式

```java
int insert (T t)
```

- T：泛型，新增用来保存新增数据
- int：返回值，新增成功后返回1，没有新增成功返回的是0

#### 代码示例

```java
@SpringBootTest
class Mybatisplus01QuickstartApplicationTests {

    @Autowired
    private UserDao userDao;

    @Test
    void testSave() {
        User user = new User();
        user.setName("黑马程序员");
        user.setPassword("itheima");
        user.setAge(12);
        user.setTel("4006184000");
        userDao.insert(user);
    }
}
```

#### 删除

#### 语法格式

```java
int deleteById (Serializable id)
```

#### 代码示例

```java
@SpringBootTest
class Mybatisplus01QuickstartApplicationTests {

    @Autowired
    private UserDao userDao;

    @Test
    void testDelete() {
        userDao.deleteById(1401856123725713409L);
    }
}
```

#### 修改

#### 语法格式

```java
int updateById(T t);
```

#### 代码示例

```java
@SpringBootTest
class Mybatisplus01QuickstartApplicationTests {

    @Autowired
    private UserDao userDao;

    @Test
    void testUpdate() {
        User user = new User();
        user.setId(1L);
        user.setName("Tom888");
        user.setPassword("tom888");
        userDao.updateById(user);
    }
}
```

**说明：**

在代码中通过 `user.setId(1L)` 明确指定了要更新的记录的主键值为 `1`。

#### 根据ID查询

#### 语法格式

```java
T selectById (Serializable id)
```

#### 代码示例

```java
@SpringBootTest
class Mybatisplus01QuickstartApplicationTests {

    @Autowired
    private UserDao userDao;
    
    @Test
    void testGetById() {
        User user = userDao.selectById(2L);
        System.out.println(user);
    }
}
```

#### Lombok

- @Data：是个组合注解，可自动为实体类生成所有属性的 **get/set 方法、toString 方法、equals 和 hashCode 方法。**
- @NoArgsConstructor：提供一个无参构造函数
- @AllArgsConstructor：提供一个包含所有参数的构造函数

#### 分页功能

#### 语法格式

```java
IPage<T> selectPage(IPage<T> page, Wrapper<T> queryWrapper)
```

- IPage：用来构建分页查询条件
- Wrapper：用来构建条件查询的条件，目前我们没有可直接传为Null
- IPage：返回值，你会发现构建分页条件和方法的返回值都是IPage

IPage是一个接口，我们需要找到它的实现类来构建它，具体的实现类，可以进入到IPage类中按ctrl+h，会找到其有一个实现类为`Page`。

#### 操作步骤

调用方法传入参数获取返回值

```java
@SpringBootTest
class Mybatisplus01QuickstartApplicationTests {

    @Autowired
    private UserDao userDao;
    
    //分页查询
    @Test
    void testSelectPage(){
        //1 创建IPage分页对象,设置分页参数,1为当前页码，3为每页显示的记录数
        IPage<User> page=new Page<>(1,3);
        //2 执行分页查询
        userDao.selectPage(page,null);
        //3 获取分页结果
        System.out.println("当前页码值："+page.getCurrent());
        System.out.println("每页显示数："+page.getSize());
        System.out.println("一共多少页："+page.getPages());
        System.out.println("一共多少条数据："+page.getTotal());
        System.out.println("数据："+page.getRecords());
    }
}
```

设置分页拦截器

这个拦截器MP已经为我们提供好了，我们只需要将其配置成Spring管理的bean对象即可。

```java
@Configuration
public class MybatisPlusConfig {
    
    @Bean
    public MybatisPlusInterceptor mybatisPlusInterceptor(){
        //1 创建MybatisPlusInterceptor拦截器对象
        MybatisPlusInterceptor mpInterceptor=new MybatisPlusInterceptor();
        //2 添加分页拦截器
        mpInterceptor.addInnerInterceptor(new PaginationInnerInterceptor());
        return mpInterceptor;
    }
}
```

### DQL编程控制

#### 条件查询

在进行查询的时候，我们的入口是在Wrapper这个类上，因为它是一个接口，所以我们需要去找它对应的实现类，关于实现类也有很多，说明我们有多种构建查询条件对象的方式。

![img](https://i-blog.csdnimg.cn/direct/224ab7433b5c4b6a9100a967cf1b8d5c.png)

#### 方式一：简单的 QueryWrapper

```java
@SpringBootTest
class Mybatisplus02DqlApplicationTests {

    @Autowired
    private UserDao userDao;
    
    @Test
    void testGetAll(){
        QueryWrapper qw = new QueryWrapper();
        qw.lt("age",18);
        List<User> userList = userDao.selectList(qw);
        System.out.println(userList);
    }
}
```

**说明：**

lt: 小于(<)，最终的sql语句为：

```sql
SELECT id,name,password,age,tel FROM user WHERE (age < ?)
```

#### 方式二：QueryWrapper的基础上使用lambda

```java
@SpringBootTest
class Mybatisplus02DqlApplicationTests {

    @Autowired
    private UserDao userDao;
    
    @Test
    void testGetAll(){
        QueryWrapper<User> qw = new QueryWrapper<User>();
        qw.lambda().lt(User::getAge, 10);//添加条件
        List<User> userList = userDao.selectList(qw);
        System.out.println(userList);
    }
}
```

**说明：**

① User::getAge，为lambda表达式中的方法引用，类名::方法名，最终的sql语句为：

```sql
SELECT id,name,password,age,tel FROM user WHERE (age < ?)
```

1). 用 Lambda 表达式的写法（完整逻辑）：

```java
// Lambda表达式：接收User对象，调用它的getAge()方法返回年龄
qw.lambda().lt((User user) -> user.getAge(), 10);
```

2). 用方法引用的简化写法

```java
// 方法引用：直接指向User类的getAge()方法，效果和上面的Lambda完全一样
qw.lambda().lt(User::getAge, 10);
```

② **注意：**构建LambdaQueryWrapper的时候泛型不能省。

#### 方式三：LambdaQueryWrapper（推荐）

```java
@SpringBootTest
class Mybatisplus02DqlApplicationTests {

    @Autowired
    private UserDao userDao;
    
    @Test
    void testGetAll(){
        LambdaQueryWrapper<User> lqw = new LambdaQueryWrapper<User>();
        lqw.lt(User::getAge, 10);
        List<User> userList = userDao.selectList(lqw);
        System.out.println(userList);
    }
}
```

#### 多条件构建

需求：查询数据库表中，年龄在10岁到30岁之间的用户信息

```java
@SpringBootTest
class Mybatisplus02DqlApplicationTests {

    @Autowired
    private UserDao userDao;
    
    @Test
    void testGetAll(){
        LambdaQueryWrapper<User> lqw = new LambdaQueryWrapper<User>();
        lqw.lt(User::getAge, 30);
        lqw.gt(User::getAge, 10);
        List<User> userList = userDao.selectList(lqw);
        System.out.println(userList);
    }
}
```

**说明：**

1). gt：大于(>)，最终的SQL语句为：

```sql
SELECT id,name,password,age,tel FROM user WHERE (age < ? AND age > ?)
```

2). 构建多条件的时候，可以支持链式编程

```java
LambdaQueryWrapper<User> lqw = new LambdaQueryWrapper<User>();
lqw.lt(User::getAge, 30).gt(User::getAge, 10);
List<User> userList = userDao.selectList(lqw);
System.out.println(userList);
```

需求：查询数据库表中，年龄小于10或年龄大于30的数据

```java
@SpringBootTest
class Mybatisplus02DqlApplicationTests {

    @Autowired
    private UserDao userDao;
    
    @Test
    void testGetAll(){
        LambdaQueryWrapper<User> lqw = new LambdaQueryWrapper<User>();
        lqw.lt(User::getAge, 10).or().gt(User::getAge, 30);
        List<User> userList = userDao.selectList(lqw);
        System.out.println(userList);
    }
}
```

**说明：**

or()就相当于我们sql语句中的`or`关键字，不加默认是`and`，最终的sql语句为：

```sql
SELECT id,name,password,age,tel FROM user WHERE (age < ? OR age > ?)
```

#### null 判定

#### 存在的问题

先来看一张图：

![img](https://i-blog.csdnimg.cn/direct/708daeff33354fd282fd892d2735c5ef.png)

- 我们在做条件查询的时候，一般会有很多条件可以供用户进行选择查询。
- 这些条件用户可以选择使用也可以选择不使用，比如我要查询价格在8000以上的手机
- 在输入条件的时候，价格有一个区间范围，按照需求只需要在第一个价格输入框中输入8000
- 后台在做价格查询的时候，一般会让 price>值1 and price <值2
- 因为前端没有输入值2，所以如果不处理的话，就会出现 price>8000 and price < null问题
- 这个时候查询的结果就会出问题，具体该如何解决?

#### 操作步骤

1). 新建一个模型类，让其继承User类，并在其中添加age2属性，UserQuery在拥有User属性后同时添加了age2属性。

```java
@Data
public class User {
    private Long id;
    private String name;
    private String password;
    private Integer age;
    private String tel;
}

@Data
public class UserQuery extends User {
    private Integer age2;
}
```

2). 查询方式

```java
@SpringBootTest
class Mybatisplus02DqlApplicationTests {

    @Autowired
    private UserDao userDao;
    
    @Test
    void testGetAll(){
        //模拟页面传递过来的查询数据
        UserQuery uq = new UserQuery();
        uq.setAge(10);
        uq.setAge2(30);
        LambdaQueryWrapper<User> lqw = new LambdaQueryWrapper<User>();
        lqw.lt(null!=uq.getAge2(),User::getAge, uq.getAge2());
        lqw.gt(null!=uq.getAge(),User::getAge, uq.getAge());
        List<User> userList = userDao.selectList(lqw);
        System.out.println(userList);
    }
}
```

**说明：**

lt()方法

![img](https://i-blog.csdnimg.cn/direct/c28247095a9b463591bcb18b378eb645.png)

condition为boolean类型，返回true，则添加条件，返回false则不添加条件

你代码里的`lqw.lt(null!=uq.getAge2(),User::getAge, uq.getAge2())`，第一个参数`null!=uq.getAge2()`是 MyBatis-Plus 提供的**条件过滤功能**：

- 如果`null!=uq.getAge2()`为`true`（即前端传了 age2 参数）：就把`age < 30`这个条件加入 SQL；
- 如果`null!=uq.getAge2()`为`false`（即前端没传 age2）：就忽略这个条件，不会生成`age < null`这种无效 SQL。

#### 查询投影

#### 查询指定字段

```java
@SpringBootTest
class Mybatisplus02DqlApplicationTests {

    @Autowired
    private UserDao userDao;
    
    @Test
    void testGetAll(){
        LambdaQueryWrapper<User> lqw = new LambdaQueryWrapper<User>();
        lqw.select(User::getId,User::getName,User::getAge);
        List<User> userList = userDao.selectList(lqw);
        System.out.println(userList);
    }
}
```

**说明：**

① select(...)方法用来设置查询的字段列，可以设置多个，最终的sql语句为：

```sql
SELECT id,name,age FROM user
```

② `lqw.select(User::getId, User::getName, User::getAge)`：这是**方法引用**的应用，MyBatis-Plus 会根据`User`类的`getXxx()`方法，自动解析出数据库的字段名（`getId`→`id`，`getName`→`name`），避免手写字段名出错（比如把`name`写成`naem`）。

#### 聚合查询

```java
@SpringBootTest
class Mybatisplus02DqlApplicationTests {

    @Autowired
    private UserDao userDao;
    
    @Test
    void testGetAll(){
        QueryWrapper<User> lqw = new QueryWrapper<User>();
        //lqw.select("count(*) as count");
        //SELECT count(*) as count FROM user
        //lqw.select("max(age) as maxAge");
        //SELECT max(age) as maxAge FROM user
        //lqw.select("min(age) as minAge");
        //SELECT min(age) as minAge FROM user
        //lqw.select("sum(age) as sumAge");
        //SELECT sum(age) as sumAge FROM user
        lqw.select("avg(age) as avgAge");
        //SELECT avg(age) as avgAge FROM user
        List<Map<String, Object>> userList = userDao.selectMaps(lqw);
        System.out.println(userList);
    }
}
```

**说明：**

① 为什么用 `QueryWrapper` 而不是 `LambdaQueryWrapper`？

因为这里要直接写 SQL 片段（如 `avg(age)`），而不是引用实体类的方法。Lambda 方式更适合查询实体类字段，而直接写 SQL 片段时，普通 `QueryWrapper` 更灵活。

② 为什么用 `selectMaps` 而不是 `selectList`？

`selectList` 要求返回的每一行数据都能映射为 `User` 对象，但聚合函数（如 `avg(age)`）的结果不是 `User` 类的字段，无法直接封装成 `User`。`selectMaps` 会把每一行结果封装成一个 `Map<String, Object>`，其中：

- Key 是列名（或别名，如 `avgAge`）
- Value 是对应的值（如平均年龄 25.5）

#### 分组查询

```java
@SpringBootTest
class Mybatisplus02DqlApplicationTests {

    @Autowired
    private UserDao userDao;
    
    @Test
    void testGetAll(){
        QueryWrapper<User> lqw = new QueryWrapper<User>();
        lqw.select("count(*) as count,tel");
        lqw.groupBy("tel");
        List<Map<String, Object>> list = userDao.selectMaps(lqw);
        System.out.println(list);
    }
}
```

#### 查询条件

#### 等值查询

需求

根据用户名和密码查询用户信息

#### 代码实现

```java
@SpringBootTest
class Mybatisplus02DqlApplicationTests {

    @Autowired
    private UserDao userDao;
    
    @Test
    void testGetAll(){
        LambdaQueryWrapper<User> lqw = new LambdaQueryWrapper<User>();
        lqw.eq(User::getName, "Jerry").eq(User::getPassword, "jerry");
        User loginUser = userDao.selectOne(lqw);
        System.out.println(loginUser);
    }
}
```

**说明：**

eq()：相当于 `=`，对应的sql语句为：

```sql
SELECT id,name,password,age,tel FROM user WHERE (name = ? AND password = ?)
```

- selectList：查询结果为多个或者单个
- selectOne：查询结果为单个

#### 范围查询

需求

对年龄进行范围查询，使用lt()、le()、gt()、ge()、between()进行范围查询

#### 代码实现

```java
@SpringBootTest
class Mybatisplus02DqlApplicationTests {

    @Autowired
    private UserDao userDao;
    
    @Test
    void testGetAll(){
        LambdaQueryWrapper<User> lqw = new LambdaQueryWrapper<User>();
        lqw.between(User::getAge, 10, 30);
        //SELECT id,name,password,age,tel FROM user WHERE (age BETWEEN ? AND ?)
        List<User> userList = userDao.selectList(lqw);
        System.out.println(userList);
    }
}
```

- gt()：大于(>)
- ge()：大于等于(>=)
- lt()：小于(<)
- le()：小于等于(<=)
- between()：between ? and ?

#### 模糊查询

需求

查询表中name属性的值以`J`开头的用户信息，使用like进行模糊查询

#### 代码实现

```java
@SpringBootTest
class Mybatisplus02DqlApplicationTests {

    @Autowired
    private UserDao userDao;
    
    @Test
    void testGetAll(){
        LambdaQueryWrapper<User> lqw = new LambdaQueryWrapper<User>();
        lqw.likeLeft(User::getName, "J");
        //SELECT id,name,password,age,tel FROM user WHERE (name LIKE ?)
        List<User> userList = userDao.selectList(lqw);
        System.out.println(userList);
    }
}
```

**说明：**

- like()：前后加百分号,如 %J%
- likeLeft()：前面加百分号,如 %J
- likeRight()：后面加百分号,如 J%

#### 映射匹配兼容性

#### 存在的问题

#### 问题1：表字段与编码属性设计不同步

① 当表的列名和模型类的属性名发生不一致，就会导致数据封装不到模型对象，这个时候就需要其中一方做出修改，那如果前提是两边都不能改又该如何解决?

② MP给我们提供了一个注解`@TableField`，使用该注解可以实现模型类属性名和表的列名之间的映射关系

![img](https://i-blog.csdnimg.cn/direct/7395f10d81f9404c8e9b5ce8617311da.png)

#### 问题2：编码中添加了数据库中未定义的属性

① 当模型类中多了一个数据库表不存在的字段，就会导致生成的sql语句中在select的时候查询了数据库不存在的字段，程序运行就会报错，错误信息为：

Unknown column '多出来的字段名称' in 'field list'

② 具体的解决方案用到的还是`@TableField`注解，它有一个属性叫`exist`，设置该字段是否在数据库表中存在，如果设置为false则不存在，生成sql语句查询的时候，就不会再查询该字段了。

![img](https://i-blog.csdnimg.cn/direct/20e428452c5a448d96282ed6c16064d0.png)

#### 问题3：采用默认查询开放了更多的字段查看权限

① 查询表中所有的列的数据，就可能把一些敏感数据查询到返回给前端，这个时候我们就需要限制哪些字段默认不要进行查询。

② 解决方案是`@TableField`注解的一个属性叫`select`，该属性设置默认是否需要查询该字段的值，true(默认值)表示默认查询该字段，false表示默认不查询该字段。

![img](https://i-blog.csdnimg.cn/direct/2ab4ac7c0ada4317b037131636873ce6.png)

#### 代码实现

① 修改数据库表user为tbl_user

直接查询会报错，原因是MP默认情况下会使用模型类的类名首字母小写当表名使用。

![img](https://i-blog.csdnimg.cn/direct/f291a618c94f4435adead3256f5a1721.png)

② 模型类添加@TableName注解

```java
@Data
@TableName("tbl_user")
public class User {
    private Long id;
    private String name;
    private String password;
    private Integer age;
    private String tel;
}
```

③ 将字段password修改成pwd

直接查询会报错，原因是MP默认情况下会使用模型类的属性名当做表的列名使用

④ 使用@TableField映射关系

```java
@Data
@TableName("tbl_user")
public class User {
    private Long id;
    private String name;
    @TableField(value="pwd")
    private String password;
    private Integer age;
    private String tel;
}
```

#### 知识点

@TableField

| 名称     | @TableField                                                  |
| -------- | ------------------------------------------------------------ |
| 类型     | 属性注解                                                     |
| 位置     | 模型类属性定义上方                                           |
| 作用     | 设置当前属性对应的数据库表中的字段关系                       |
| 相关属性 | value(默认)：设置数据库表字段名称 			exist：设置属性在数据库表字段中是否存在，默认为true，此属性不能与value合并使用 			select：设置属性是否参与查询，此属性与select()映射配置不冲突 |

@TableName

| 名称     | @TableName                    |
| -------- | ----------------------------- |
| 类型     | 类注解                        |
| 位置     | 模型类定义上方                |
| 作用     | 设置当前类对应于数据库表关系  |
| 相关属性 | value(默认)：设置数据库表名称 |

### DML编程控制

#### 生成策略

- NONE：不设置id生成策略
- INPUT：用户手工输入id
- ASSIGN_ID：雪花算法生成id(可兼容数值型与字符串型)
- ASSIGN_UUID：以UUID生成算法作为id生成策略
- 其他的几个策略均已过时，都将被ASSIGN_ID和ASSIGN_UUID代替掉。

#### 代码实现

#### INPUT策略

① 设置生成策略为INPUT

```java
@Data
@TableName("tbl_user")
public class User {
    @TableId(type = IdType.INPUT)
    private Long id;
    private String name;
    @TableField(value="pwd",select=false)
    private String password;
    private Integer age;
    private String tel;
    @TableField(exist=false)
    private Integer online;
}
```

② 添加数据手动设置ID

```java
@SpringBootTest
class Mybatisplus03DqlApplicationTests {

    @Autowired
    private UserDao userDao;
	
    @Test
    void testSave(){
        User user = new User();
        //设置主键ID的值
        user.setId(666L);
        user.setName("黑马程序员");
        user.setPassword("itheima");
        user.setAge(12);
        user.setTel("4006184000");
        userDao.insert(user);
    }
}
```

#### ASSIGN_ID策略（雪花算法）

① 设置生成策略为ASSIGN_ID

```java
@Data
@TableName("tbl_user")
public class User {
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;
    private String name;
    @TableField(value="pwd",select=false)
    private String password;
    private Integer age;
    private String tel;
    @TableField(exist=false)
    private Integer online;
}
```

② 添加数据不设置ID

```java
@SpringBootTest
class Mybatisplus03DqlApplicationTests {

    @Autowired
    private UserDao userDao;
	
    @Test
    void testSave(){
        User user = new User();
        user.setName("黑马程序员");
        user.setPassword("itheima");
        user.setAge(12);
        user.setTel("4006184000");
        userDao.insert(user);
    }
}
```

#### ASSIGN_UUID策略

① 设置生成策略为ASSIGN_UUID

使用uuid需要注意的是，主键的类型不能是Long，而应该改成String类型

```java
@Data
@TableName("tbl_user")
public class User {
    @TableId(type = IdType.ASSIGN_UUID)
    private String id;
    private String name;
    @TableField(value="pwd",select=false)
    private String password;
    private Integer age;
    private String tel;
    @TableField(exist=false)
    private Integer online;
}
```

② 添加数据不设置ID

#### 知识点

| 名称     | @TableId                                                     |
| -------- | ------------------------------------------------------------ |
| 类型     | 属性注解                                                     |
| 位置     | 模型类中用于表示主键的属性定义上方                           |
| 作用     | 设置当前类中主键属性的生成策略                               |
| 相关属性 | value(默认)：设置数据库表主键名称 type：设置主键属性的生成策略，值查照IdType的枚举值 |

#### 多记录操作

#### 批量删除

```java
@SpringBootTest
class Mybatisplus03DqlApplicationTests {

    @Autowired
    private UserDao userDao;
	
    @Test
    void testDelete(){
        //删除指定多条数据
        List<Long> list = new ArrayList<>();
        list.add(1402551342481838081L);
        list.add(1402553134049501186L);
        list.add(1402553619611430913L);
        userDao.deleteBatchIds(list);
    }
}
```

#### 逻辑删除

#### 实体类添加属性

标识新增的字段为逻辑删除字段，使用`@TableLogic`

```java
@Data
//@TableName("tbl_user") 可以不写是因为配置了全局配置
public class User {
    @TableId(type = IdType.ASSIGN_UUID)
    private String id;
    private String name;
    @TableField(value="pwd",select=false)
    private String password;
    private Integer age;
    private String tel;
    @TableField(exist=false)
    private Integer online;
    @TableLogic(value="0",delval="1")
    //value为正常数据的值，delval为删除数据的值
    private Integer deleted;
}
```

#### 知识点

| 名称     | @TableLogic                             |
| -------- | --------------------------------------- |
| 类型     | 属性注解                                |
| 位置     | 模型类中用于表示删除字段的属性定义上方  |
| 作用     | 标识该字段为进行逻辑删除的字段          |
| 相关属性 | value：逻辑未删除值，delval：逻辑删除值 |

#### 乐观锁

#### 实现思路

① 数据库表中添加 version 列，默认值给 1

- 就像给每张票加一个 “版本号”，初始是 1。

② 线程 1 修改前，取出记录，获取 version=1

- 你看到票的版本号是 1。

③ 线程 2 修改前，取出记录，获取 version=1

- 你朋友也看到票的版本号是 1。

④ 线程 1 执行更新：set version = 2 where version = 1

- 你下单：“只有版本号还是 1，我才把它改成 2”。
- 如果成功，票的版本号就变成 2 了。

⑤ 线程 2 执行更新：set version = 2 where version = 1

- 你朋友下单：“只有版本号还是 1，我才把它改成 2”。
- 但此时版本号已经是 2 了，所以他的更新条件不满足，执行失败。

#### 代码实现

**① 在模型类中添加对应的属性**

根据添加的字段列名，在模型类中添加对应的属性值

```java
@Data
//@TableName("tbl_user") 可以不写是因为配置了全局配置
public class User {
    @TableId(type = IdType.ASSIGN_UUID)
    private String id;
    private String name;
    @TableField(value="pwd",select=false)
    private String password;
    private Integer age;
    private String tel;
    @TableField(exist=false)
    private Integer online;
    private Integer deleted;
    @Version
    private Integer version;
}
```

**② 添加乐观锁的拦截器**

```java
@Configuration
public class MpConfig {
    @Bean
    public MybatisPlusInterceptor mpInterceptor() {
        //1.定义Mp拦截器
        MybatisPlusInterceptor mpInterceptor = new MybatisPlusInterceptor();
        //2.添加乐观锁拦截器
        mpInterceptor.addInnerInterceptor(new OptimisticLockerInnerInterceptor());
        return mpInterceptor;
    }
}
```

### 快速开发

#### 代码生成器实现

#### 创建代码生成类

```java
public class CodeGenerator {
    public static void main(String[] args) {
        //1.获取代码生成器的对象
        AutoGenerator autoGenerator = new AutoGenerator();

        //设置数据库相关配置
        DataSourceConfig dataSource = new DataSourceConfig();
        dataSource.setDriverName("com.mysql.cj.jdbc.Driver");
        dataSource.setUrl("jdbc:mysql://localhost:3306/mybatisplus_db?serverTimezone=UTC");
        dataSource.setUsername("root");
        dataSource.setPassword("root");
        autoGenerator.setDataSource(dataSource);

        //设置全局配置
        GlobalConfig globalConfig = new GlobalConfig();
        globalConfig.setOutputDir(System.getProperty("user.dir")+"/mybatisplus_04_generator/src/main/java");    //设置代码生成位置
        globalConfig.setOpen(false);    //设置生成完毕后是否打开生成代码所在的目录
        globalConfig.setAuthor("黑马程序员");    //设置作者
        globalConfig.setFileOverride(true);     //设置是否覆盖原始生成的文件
        globalConfig.setMapperName("%sDao");    //设置数据层接口名，%s为占位符，指代模块名称
        globalConfig.setIdType(IdType.ASSIGN_ID);   //设置Id生成策略
        autoGenerator.setGlobalConfig(globalConfig);

        //设置包名相关配置
        PackageConfig packageInfo = new PackageConfig();
        packageInfo.setParent("com.aaa");   //设置生成的包名，与代码所在位置不冲突，二者叠加组成完整路径
        packageInfo.setEntity("domain");    //设置实体类包名
        packageInfo.setMapper("dao");   //设置数据层包名
        autoGenerator.setPackageInfo(packageInfo);

        //策略设置
        StrategyConfig strategyConfig = new StrategyConfig();
        strategyConfig.setInclude("tbl_user");  //设置当前参与生成的表名，参数为可变参数
        strategyConfig.setTablePrefix("tbl_");  //设置数据库表的前缀名称，模块名 = 数据库表名 - 前缀名  例如： User = tbl_user - tbl_
        strategyConfig.setRestControllerStyle(true);    //设置是否启用Rest风格
        strategyConfig.setVersionFieldName("version");  //设置乐观锁字段名
        strategyConfig.setLogicDeleteFieldName("deleted");  //设置逻辑删除字段名
        strategyConfig.setEntityLombokModel(true);  //设置是否启用lombok
        autoGenerator.setStrategy(strategyConfig);
        //2.执行生成操作
        autoGenerator.execute();
    }
}
```

