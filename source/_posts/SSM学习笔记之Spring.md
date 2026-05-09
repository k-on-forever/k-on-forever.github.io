---
title: SSM学习笔记之 Spring
date: 2026-03-20 09:00:00
updated: 2026-03-20 09:00:00
categories:
  - Spring
tags:
  - Spring
description: Spring 核心概念、IoC/DI、Bean 与入门案例
cover: /img/spring.jpg
---

## SSM学习笔记

### Spring相关概念

#### Spring4 架构图

<img src="https://i-blog.csdnimg.cn/direct/803a448a3d69410781f30866d69af89b.png" alt="img" style="zoom:50%;" />

##### 核心层

- Core Container:核心容器，这个模块是Spring最核心的模块，其他的都需要依赖该模块

##### AOP层

- AOP:面向切面编程，它依赖核心层容器，目的是在不改变原有代码的前提下对其进行功能增强
- Aspects:AOP是思想,Aspects是对AOP思想的具体实现

##### 数据层

- Data Access:数据访问，Spring全家桶中有对数据访问的具体实现技术
- Data Integration:数据集成，Spring支持整合其他的数据层解决方案，比如Mybatis
- Transactions:事务，Spring中事务管理是Spring AOP的一个具体实现，也是后期学习的重点内容

##### Web层

- 这一层的内容将在SpringMVC框架具体学习

##### Test层

- Spring主要整合了Junit来完成单元测试和集成测试

#### IoC、IoC容器、Bean、DI

##### 什么是控制反转？

使用对象时，由主动new产生对象转换为由**外部**提供对象，此过程中对象创建控制权由程序转移到外部，此思想称为控制反转。

##### Spring和IoC之间的关系是什么呢?

- Spring技术对IoC思想进行了实现
- Spring提供了一个容器，称为IoC容器，用来充当IoC思想中的"外部"

##### IoC容器的作用以及内部存放的是什么?

- IoC容器负责对象的创建、初始化等一系列工作，其中包含了数据层和业务层的类对象
- 被创建或被管理的对象在IoC容器中统称为Bean
- IoC容器中放的就是一个个的Bean对象

##### DI（Dependency Injection）依赖注入

在容器中建立bean与bean之间的依赖关系的整个过程，称为依赖注入

<img src="https://i-blog.csdnimg.cn/direct/4a71c286ea724e1e96d6be11d07665e2.png" alt="img" style="zoom:50%;" />

### 入门案例

#### IoC入门案例

##### 关键步骤

① 在配置文件中完成bean的配置

```XML
    <!--bean标签标示配置bean
    	id属性标示给bean起名字
    	class属性表示给bean定义类型
	-->
	<bean id="bookDao" class="com.itheima.dao.impl.BookDaoImpl"/>
    <bean id="bookService" class="com.itheima.service.impl.BookServiceImpl"/>

</beans>
```

**核心逻辑：**

① 为什么 class 类型指定的是实现类，不是接口？

直接原因：Spring IOC 容器的核心是**创建对象实例**，如果你把 class 指定为接口（比如`com.itheima.dao.BookDao`），Spring 容器在尝试创建对象时，会和上面的 Java 代码一样失败 —— 因为它无法实例化一个接口，最终会抛出类似`Cannot instantiate interface com.itheima.dao.BookDao`的异常。

从容器中获取对象进行方法调用

```java
public class App {
    public static void main(String[] args) {
        //获取IoC容器
		ApplicationContext ctx = new ClassPathXmlApplicationContext("applicationContext.xml"); 
//        BookDao bookDao = (BookDao) ctx.getBean("bookDao");
//        bookDao.save();
        BookService bookService = (BookService) ctx.getBean("bookService");
        bookService.save();
    }
}
```

#### DI入门实例

##### 关键步骤

修改配置完成注入

```XML
    <!--bean标签标示配置bean
    	id属性标示给bean起名字
    	class属性表示给bean定义类型
	-->
    <bean id="bookDao" class="com.itheima.dao.impl.BookDaoImpl"/>

    <bean id="bookService" class="com.itheima.service.impl.BookServiceImpl">
        <!--配置server与dao的关系-->
        <!--property标签表示配置当前bean的属性
        		name属性表示配置哪一个具体的属性
        		ref属性表示参照哪一个bean
		-->
        <property name="bookDao" ref="bookDao"/>
    </bean>

</beans>
```

**注意：配置中的两个bookDao的含义是不一样的**

1). name="bookDao"中`bookDao`的作用是让Spring的IoC容器在获取到名称后，将首字母小写，前面加set找对应的`setBookDao()`方法进行对象注入

对应 `BookServiceImpl` 的代码：

```java
public class BookServiceImpl implements BookService {
    // 👇 这里的变量名是 bookDao，所以 name 必须写 "bookDao"
    private BookDao bookDao;

    // 👇 setter方法名是 setBookDao，Spring 会自动匹配 "bookDao"（去掉set，首字母小写）
    public void setBookDao(BookDao bookDao) {
        this.bookDao = bookDao;
    }
}
```

- 如果把类里的变量名改成 `dao`，setter 改成 `setDao`，那配置里的 `name` 必须改成 `"dao"`，否则 Spring 找不到要赋值的属性，会报错；
- 比如：`private BookDao dao; + public void setDao(BookDao dao)` → 配置要写成 `<property name="dao" ref="bookDao"/>`。

2). ref="bookDao"中`bookDao`的作用是让Spring能在IoC容器中找到id为`bookDao`的Bean对象给`bookService`进行注入

<img src="https://i-blog.csdnimg.cn/direct/89890451bdef4d0ea08e4ff4055f8b64.png" alt="img" style="zoom: 50%;" />

### IoC相关内容

#### bean基础配置

##### bean基础配置(id与class)

<img src="https://i-blog.csdnimg.cn/direct/4316474407014198bc563aab8a0bc9e9.png" alt="img" style="zoom:50%;" />

##### bean的name属性

![img](https://i-blog.csdnimg.cn/direct/eacef96074d84fd69454416ea59fe1de.png)

① 代码实现

**步骤1：配置别名**

打开spring的配置文件applicationContext.xml

```XML
    <!--name:为bean指定别名，别名可以有多个，使用逗号，分号，空格进行分隔-->
    <bean id="bookService" name="service service4 bookEbi" class="com.itheima.service.impl.BookServiceImpl">
        <property name="bookDao" ref="bookDao"/>
    </bean>

    <!--scope：为bean设置作用范围，可选值为单例singloton，非单例prototype-->
    <bean id="bookDao" name="dao" class="com.itheima.dao.impl.BookDaoImpl"/>
</beans>
```

**步骤2：根据名称容器中获取bean对象**

```java
public class AppForName {
    public static void main(String[] args) {
        ApplicationContext ctx = new ClassPathXmlApplicationContext("applicationContext.xml");
        //此处根据bean标签的id属性和name属性的任意一个值来获取bean对象
        BookService bookService = (BookService) ctx.getBean("service4");
        bookService.save();
    }
}
```

##### bean作用范围scope配置

<img src="https://i-blog.csdnimg.cn/direct/4043b5769f864477975537637a6b10f5.png" alt="img" style="zoom: 50%;" />

**代码实现**

**1). 单例**

```XML
<bean id="bookDao" name="dao" class="com.itheima.dao.impl.BookDaoImpl" scope="singleton"/>
```

**2). 非单例**

```XML
<bean id="bookDao" name="dao" class="com.itheima.dao.impl.BookDaoImpl" scope="prototype"/>
```

#### bean实例化

##### 构造方法实例化

① 编写运行程序

```java
public class AppForInstanceBook {
    public static void main(String[] args) {
        ApplicationContext ctx = new 
            ClassPathXmlApplicationContext("applicationContext.xml");
        BookDao bookDao = (BookDao) ctx.getBean("bookDao");
        bookDao.save();

    }
}
```

② BookDaoImpl

在BookDaoImpl类中添加一个无参构造函数，并打印一句话，方便观察结果。

```java
public class BookDaoImpl implements BookDao {
    public BookDaoImpl() {
        System.out.println("book dao constructor is running ....");
    }
    public void save() {
        System.out.println("book dao save ...");
    }

}
```

**无参构造方法是在执行 `new ClassPathXmlApplicationContext("applicationContext.xml")` 这行代码时被 Spring 调用的**

**第一步：执行`new ClassPathXmlApplicationContext(...)`时，Spring 会做这些事：**

- 解析`applicationContext.xml`，找到`<bean id="bookDao" class="com.itheima.dao.impl.BookDaoImpl"/>`这个配置；
- 通过反射获取`BookDaoImpl`的 Class 对象；
- 调用`BookDaoImpl`的**无参构造方法**创建实例（这就是 “构造方法实例化” 的核心步骤）；
- 把创建好的实例存入容器，等待后续获取。✅ 这一步，你写在`BookDaoImpl`无参构造里的`System.out.println("book dao constructor is running ....")`就会执行 —— 控制台打印这句话，就是无参构造被调用的铁证。

**第二步：执行`ctx.getBean("bookDao")`**

Spring 从自己的 “对象仓库” 里，找到`id=bookDao`的对象（就是刚才创建好的`BookDaoImpl`实例），把它返回给你。

**第三步：执行`bookDao.save()`**

调用这个对象的`save()`方法，控制台打印：`book dao save ...`。

##### 静态工厂实例化（了解即可）

① 准备一个OrderDao和OrderDaoImpl类

```java
public interface OrderDao {
    public void save();
}

public class OrderDaoImpl implements OrderDao {
    public void save() {
        System.out.println("order dao save ...");
    }
}
```

② 创建一个工厂类OrderDaoFactory并提供一个静态方法

```java
//静态工厂创建对象
public class OrderDaoFactory {
    public static OrderDao getOrderDao(){
        return new OrderDaoImpl();
    }
}
```

③ 编写AppForInstanceOrder运行类，在类中通过工厂获取对象

```java
public class AppForInstanceOrder {
    public static void main(String[] args) {
        //通过静态工厂创建对象
        OrderDao orderDao = OrderDaoFactory.getOrderDao();
        orderDao.save();
    }
}
```

④ 在spring的配置文件中添加以下内容

```XML
<bean id="orderDao" class="com.itheima.factory.OrderDaoFactory" factory-method="getOrderDao"/>
```

**1). 关键部分解析：**

**class：**工厂类的类全名

**factory-mehod：**具体工厂类中创建对象的方法名

**2). 对应关系如下图：**

<img src="https://i-blog.csdnimg.cn/direct/a3c64df4cc034c68aed8a14cf42b9755.png" alt="img" style="zoom:50%;" />

⑤ 在AppForInstanceOrder运行类，使用从IoC容器中获取bean的方法进行运行测试

```java
public class AppForInstanceOrder {
    public static void main(String[] args) {
        ApplicationContext ctx = new ClassPathXmlApplicationContext("applicationContext.xml");

        OrderDao orderDao = (OrderDao) ctx.getBean("orderDao");

        orderDao.save();

    }
}
```

- Spring 加载`OrderDaoFactory`类（无需创建工厂类实例，因为方法是静态的）；
- 调用`OrderDaoFactory.getOrderDao()`静态方法；
- 将方法返回的`OrderDaoImpl`实例存入容器，标识为`orderDao`；
- 后续`ctx.getBean("orderDao")`获取的就是这个实例。

##### 实例工厂与FactoryBean

① 准备一个UserDao和UserDaoImpl类

```java
public interface UserDao {
    public void save();
}

public class UserDaoImpl implements UserDao {

    public void save() {
        System.out.println("user dao save ...");
    }
}
```

② 创建一个工厂类OrderDaoFactory并提供一个普通方法，注意此处和静态工厂的工厂类不一样的地方是方法，关键在于此处**不是静态方法**

```java
public class UserDaoFactory {
    public UserDao getUserDao(){
        return new UserDaoImpl();
    }
}
```

③ 编写AppForInstanceUser运行类，在类中通过工厂获取对象

```java
public class AppForInstanceUser {
    public static void main(String[] args) {
        //创建实例工厂对象
        UserDaoFactory userDaoFactory = new UserDaoFactory();
        //通过实例工厂对象创建对象
        UserDao userDao = userDaoFactory.getUserDao();
        userDao.save();
}
```

④ 在spring的配置文件中添加以下内容

```XML
<bean id="userFactory" class="com.itheima.factory.UserDaoFactory"/>
<bean id="userDao" factory-method="getUserDao" factory-bean="userFactory"/>
```

实例化工厂运行的顺序是:

- 创建实例化工厂对象,对应的是第一行配置
- 调用对象中的方法来创建bean，对应的是第二行配置
  - factory-bean：工厂的实例对象
  - factory-method：工厂对象中的具体创建对象的方法名,对应关系如下:

<img src="https://i-blog.csdnimg.cn/direct/5d12b3cada214273a0d3ea38ef51f0f6.png" alt="img" style="zoom: 50%;" />

##### FactoryBean的使用（重要）

① 创建一个UserDaoFactoryBean的类，实现FactoryBean接口，重写接口的方法

```java
public class UserDaoFactoryBean implements FactoryBean<UserDao> {
    //代替原始实例工厂中创建对象的方法
    public UserDao getObject() throws Exception {
        return new UserDaoImpl();
    }
    //返回所创建类的Class对象
    public Class<?> getObjectType() {
        return UserDao.class;
    }
}
```

② 在Spring的配置文件中进行配置

```XML
<bean id="userDao" class="com.itheima.factory.UserDaoFactoryBean"/>
```

#### bean的生命周期

##### 思路分析

- bean创建之后，想要添加内容，比如用来初始化需要用到资源
- bean销毁之前，想要添加内容，比如用来释放用到的资源

##### 代码实现

**① 添加初始化和销毁方法**

```java
public class BookDaoImpl implements BookDao {
    public void save() {
        System.out.println("book dao save ...");
    }
    //表示bean初始化对应的操作
    public void init(){
        System.out.println("init...");
    }
    //表示bean销毁前对应的操作
    public void destory(){
        System.out.println("destory...");
    }
}
```

**② 配置生命周期**

```XML
<bean id="bookDao" class="com.itheima.dao.impl.BookDaoImpl" init-method="init" destory-method="destory"/>
```

Spring 创建`bookDao`这个 Bean 实例后，会**自动调用**`BookDaoImpl`类中名为`init`的方法（初始化逻辑）；当 Spring 容器关闭、销毁`bookDao`实例前，会**自动调用**类中名为`destroy`的方法（销毁 / 清理逻辑）。

**③ close关闭容器**

```java
ClassPathXmlApplicationContext ctx = new 
    ClassPathXmlApplicationContext("applicationContext.xml");
```

### DI相关内容

#### setter注入

##### 注入简单数据类型

需求：给BookDaoImpl注入一些简单数据类型的数据

1. 在BookDaoImpl类中声明对应的简单数据类型的属性
2. 为这些属性提供对应的setter方法
3. 在applicationContext.xml中配置

**① 声明属性并提供setter方法**

```java
public class BookDaoImpl implements BookDao {

    private String databaseName;
    private int connectionNum;

    public void setConnectionNum(int connectionNum) {
        this.connectionNum = connectionNum;
    }

    public void setDatabaseName(String databaseName) {
        this.databaseName = databaseName;
    }

    public void save() {
        System.out.println("book dao save ..."+databaseName+","+connectionNum);
    }
}
```

**② 配置文件中进行注入配置**

```XML
    <bean id="bookDao" class="com.itheima.dao.impl.BookDaoImpl">
        <property name="databaseName" value="mysql"/>
     	<property name="connectionNum" value="10"/>
    </bean>
    <bean id="userDao" class="com.itheima.dao.impl.UserDaoImpl"/>
    <bean id="bookService" class="com.itheima.service.impl.BookServiceImpl">
        <property name="bookDao" ref="bookDao"/>
        <property name="userDao" ref="userDao"/>
    </bean>
</beans>
```

- 对于**引用数据类型**使用的是`<property name="" ref=""/>`
- 对于**简单数据类型**使用的是`<property name="" value=""/>`

##### 构造器注入引用数据类型

(1) 思路分析

1. 将bookDao的setter方法删除掉
2. 添加带有bookDao参数的构造方法
3. 在applicationContext.xml中配置

(2) 代码实现

**① 删除setter方法并提供构造方法**

原来的 `BookServiceImpl`

```java
public class BookServiceImpl implements BookService {
    private BookDao bookDao;

    // 原来的 setter 方法
    public void setBookDao(BookDao bookDao) {
        this.bookDao = bookDao;
    }

    public void save() {
        System.out.println("book service save ...");
        bookDao.save();
    }
}
```

现在改成构造方法注入后：

```java
public class BookServiceImpl implements BookService{
    private BookDao bookDao;

    public BookServiceImpl(BookDao bookDao) {
        this.bookDao = bookDao;
    }

    public void save() {
        System.out.println("book service save ...");
        bookDao.save();
    }
}
```

**核心逻辑：**这个构造方法怪怪的，返回值是什么，方法名又是什么？

```java
public BookServiceImpl(BookDao bookDao) {
    this.bookDao = bookDao;
}
```

**构造方法和普通方法的核心区别**

| 特征       | 普通方法（比如 setter 方法）        | 构造方法（你问的这段代码）                 |
| ---------- | ----------------------------------- | ------------------------------------------ |
| 方法名     | 任意（通常 set/get 开头）           | **必须和类名完全一致**                     |
| 返回值类型 | 必须声明（void/int/String 等）      | **不能声明任何返回值**（连 void 都不能写） |
| 作用       | 执行特定功能（比如赋值）            | 创建对象时**初始化对象**                   |
| 调用方式   | 对象创建后手动调用（obj.setXxx ()） | 由 JVM 自动调用（new）                     |

逐行解释：

- **方法名 `BookServiceImpl`**：**必须和类名完全一致**（你的类名就是 `BookServiceImpl`），这是构造方法的 “身份标识”，少一个字母、大小写不一样都不行。
- **没有返回值类型**：你看不到 `void`、`int` 等返回值声明，这是构造方法的强制规则 —— 因为构造方法的 “返回值” 是**创建好的当前类对象**，这个返回值由 JVM 自动处理，不需要你手动写。比如你写 `new BookServiceImpl(bookDao)` 时，JVM 会执行这个构造方法，然后自动返回一个 `BookServiceImpl` 类型的对象，你不用管返回值的声明。

**② 配置文件中进行配置构造方式注入**

```java
    <bean id="bookDao" class="com.itheima.dao.impl.BookDaoImpl"/>
    <bean id="bookService" class="com.itheima.service.impl.BookServiceImpl">
        <constructor-arg name="bookDao" ref="bookDao"/>
    </bean>
</beans>
```

**核心逻辑：**内层 `<constructor-arg>` 标签

这是构造方法注入的关键，专门用来 “给构造方法传参数”：

- `name="bookDao"`：指定要传给构造方法的**参数名**（对应你之前写的 `public BookServiceImpl(BookDao bookDao)` 里的 `bookDao` 参数）；
- `ref="bookDao"`：指定参数的**值**—— 这里的 `ref` 是 “引用” 的意思，告诉 Spring：“这个参数的值，不是新造的，而是去我的对象仓库里找那个名字叫 `bookDao` 的对象”。

Spring 启动后，会按顺序执行配置里的指令：

**1. 执行 `<bean id="bookDao" .../>`：**

- 调用 `BookDaoImpl` 的无参构造（如果没写，编译器会默认生成），创建 `BookDaoImpl` 对象；
- 把这个对象存到容器里，标记为 “id=bookDao”。

**2. 执行 `<bean id="bookService" .../>`：**

- 先看里面有 `<constructor-arg>`，知道要调用 `BookServiceImpl` 的**带参构造方法**；
- 去容器里找到 “id=bookDao” 的那个对象（就是第一步造的）；
- 调用 `new BookServiceImpl(bookDao)` 创建 `BookServiceImpl` 对象；
- 把这个对象存到容器里，标记为 “id=bookService”。

#### 构造器注入多个简单数据类型

##### 思路分析

1. 提供一个包含这两个参数的构造方法
2. 在applicationContext.xml中进行注入配置

##### 代码实现

**① 提供多个属性的构造函数**

```java
public class BookDaoImpl implements BookDao {
    private String databaseName;
    private int connectionNum;

    public BookDaoImpl(String databaseName, int connectionNum) {
        this.databaseName = databaseName;
        this.connectionNum = connectionNum;
    }

    public void save() {
        System.out.println("book dao save ..."+databaseName+","+connectionNum);
    }
}
```

② 在applicationContext.xml中配置注入

```XML
    <bean id="bookDao" class="com.itheima.dao.impl.BookDaoImpl">
        <constructor-arg name="databaseName" value="mysql"/>
        <constructor-arg name="connectionNum" value="666"/>
    </bean>
    <bean id="userDao" class="com.itheima.dao.impl.UserDaoImpl"/>
    <bean id="bookService" class="com.itheima.service.impl.BookServiceImpl">
        <constructor-arg name="bookDao" ref="bookDao"/>
        <constructor-arg name="userDao" ref="userDao"/>
    </bean>
</beans>
```

#### 为什么构造器一定是强制依赖的，setter 不是（重点）

##### setter 有参但不用传参：本质是 “我压根不调用这个方法”

setter 方法（比如 `setBookDao(BookDao bookDao)`）的参数规则是：**如果调用这个方法，就必须传 BookDao 参数；但我可以选择不调用这个方法**。

```java
public class BookServiceImpl implements BookService {
    private BookDao bookDao; // 初始值为 null

    // 有参的 setter 方法
    public void setBookDao(BookDao bookDao) {
        this.bookDao = bookDao;
    }

    public void save() {
        bookDao.save(); // 没调用 setter 的话，这里会空指针
    }

    // 测试代码
    public static void main(String[] args) {
        // 1. 创建对象：调用无参构造，完全不用管 setter
        BookServiceImpl service = new BookServiceImpl();
        
        // 2. 可选操作：我可以调用 setter（传参），也可以不调用（不传参）
        // service.setBookDao(new BookDaoImpl()); // 注释掉=不传参、不调用
        
        // 3. 运行方法：没调 setter 的话，bookDao 是 null，运行时报错
        service.save();
    }
}
```

**区分：**

- **setter 方法和构造方法是两码事**：setter 是用来给成员变量赋值的普通方法（要声明返回值），构造方法是用来创建对象的特殊方法（不用声明返回值）

##### 构造器有参就必须传参 —— 因为 “创建对象必须调用构造器”

```java
public class BookServiceImpl implements BookService {
    private BookDao bookDao;

    // 有参的构造器
    public BookServiceImpl(BookDao bookDao) {
        this.bookDao = bookDao;
    }

    // 测试代码
    public static void main(String[] args) {
        // 编译报错！因为创建对象必须调用构造器，而构造器要求传 BookDao 参数
        BookServiceImpl service = new BookServiceImpl(); 
    }
}
```

这里的关键是：**创建对象的动作（`new`）和构造器的调用是绑定的 —— 只要 new 对象，就必须调构造器，构造器要参数就必须传，躲不开**；而 setter 是 new 完对象之后的 “额外动作”，调不调全看你。

### 自动装配（了解即可）

##### 代码实现

**项目中添加BookDao、BookDaoImpl、BookService和BookServiceImpl类**

```java
public interface BookDao {
    public void save();
}

public class BookDaoImpl implements BookDao {
    
    private String databaseName;
    private int connectionNum;
    
    public void save() {
        System.out.println("book dao save ...");
    }
}
public interface BookService {
    public void save();
}

public class BookServiceImpl implements BookService{
    private BookDao bookDao;

    public void setBookDao(BookDao bookDao) {
        this.bookDao = bookDao;
    }

    public void save() {
        System.out.println("book service save ...");
        bookDao.save();
    }
}
```

**resources下提供spring的配置文件**

```XML
    <bean class="com.itheima.dao.impl.BookDaoImpl"/>
    <!--autowire属性：开启自动装配，通常使用按类型装配-->
    <bean id="bookService" class="com.itheima.service.impl.BookServiceImpl" autowire="byType"/>

</beans>
```

**核心逻辑：**按类型（`byType`）自动装配时，Spring 匹配的 “类型” 是什么

① 先找到 “要注入的成员变量”，在 `BookServiceImpl` 类里，有一个需要注入的成员变量：

```java
public class BookServiceImpl implements BookService {
    // 这个成员变量的类型是 BookDao
    private BookDao bookDao; 

    // 必须有 setter 方法（自动装配 byType/byName 都依赖 setter）
    public void setBookDao(BookDao bookDao) {
        this.bookDao = bookDao;
    }
}
```

这里的关键是：**成员变量 `bookDao` 声明的类型是 `BookDao`（接口）**，这就是 Spring 要去匹配的 “目标类型”。

② Spring 会做这几件事：

- 检查 `BookServiceImpl` 里所有需要注入的成员变量（这里就是 `bookDao`）。
- 拿到它的类型：`BookDao`。
- 去整个 IoC 容器里，找**所有类型是 `BookDao` 或其子类 / 实现类**的 bean。
- 如果找到**恰好 1 个**，就自动调用 `setBookDao()` 把它注入进去；
- 如果找到 0 个或多个，就报错（0 个注入失败，多个报 `NoUniqueBeanDefinitionException`）。

### 集合注入（了解即可）

#### 代码实现

##### 注入数组类型数据

```XML
<property name="array">
    <array>
        <value>100</value>
        <value>200</value>
        <value>300</value>
    </array>
</property>
```

##### 注入List类型数据

```XML
<property name="list">
    <list>
        <value>itcast</value>
        <value>itheima</value>
        <value>boxuegu</value>
        <value>chuanzhihui</value>
    </list>
</property>
```

##### 注入Map类型数据

```XML
<property name="map">
    <map>
        <entry key="country" value="china"/>
        <entry key="province" value="henan"/>
        <entry key="city" value="kaifeng"/>
    </map>
</property>
```

##### **注入Properties类型数据**

```XML
<property name="properties">
    <props>
        <prop key="country">china</prop>
        <prop key="province">henan</prop>
        <prop key="city">kaifeng</prop>
    </props>
</property>
```

### IoC / DI 配置管理第三方bean

#### 思路分析

(1) 使用第三方的技术，需要在pom.xml添加依赖

(2) 在配置文件中将【第三方的类】制作成一个bean，让IoC容器进行管理

(3) 数据库连接需要基础的四要素`驱动`、`连接`、`用户名`和`密码`，【如何注入】到对应的bean中

(4) 从IoC容器中获取对应的bean对象，将其打印到控制台查看结果

#### 代码实现

##### 导入`druid`的依赖

```XML
<dependency>
    <groupId>com.alibaba</groupId>
    <artifactId>druid</artifactId>
    <version>1.1.16</version>
</dependency>
```

##### 配置第三方bean

```XML
	<!--管理DruidDataSource对象-->
    <bean class="com.alibaba.druid.pool.DruidDataSource">
        <property name="driverClassName" value="com.mysql.jdbc.Driver"/>
        <property name="url" value="jdbc:mysql://localhost:3306/spring_db"/>
        <property name="username" value="root"/>
        <property name="password" value="root"/>
    </bean>
</beans>
```

**说明：**

- driverClassName:数据库驱动
- url:数据库连接地址
- username:数据库连接用户名
- password:数据库连接密码
- 数据库连接的四要素要和自己使用的数据库信息一致。

#### 加载properties文件

##### 思路分析

① 在resources下创建一个jdbc.properties(文件的名称可以任意)

② 将数据库连接四要素配置到配置文件中

③ 在Spring的配置文件中加载properties文件

④ 使用加载到的值实现属性注入

其中第3，4步骤是需要大家重点关注，具体是如何实现。

##### 代码实现

**① 准备properties配置文件**

resources下创建一个jdbc.properties文件,并添加对应的属性键值对

```XML
jdbc.driver=com.mysql.jdbc.Driver
jdbc.url=jdbc:mysql://127.0.0.1:3306/spring_db
jdbc.username=root
jdbc.password=root
```

**② 开启`context`命名空间**

```XML
<?xml version="1.0" encoding="UTF-8"?>
<beans xmlns="http://www.springframework.org/schema/beans"
       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
       xmlns:context="http://www.springframework.org/schema/context"
       xsi:schemaLocation="
            http://www.springframework.org/schema/beans
            http://www.springframework.org/schema/beans/spring-beans.xsd
            http://www.springframework.org/schema/context
            http://www.springframework.org/schema/context/spring-context.xsd">
</beans>
```

**③ 加载properties配置文件**

在配置文件中使用`context`命名空间下的标签来加载properties配置文件

```XML
<context:property-placeholder location="jdbc.properties"/>
```

**④ 完成属性注入**

```XML
    <context:property-placeholder location="jdbc.properties"/>
    <bean id="dataSource" class="com.alibaba.druid.pool.DruidDataSource">
        <property name="driverClassName" value="${jdbc.driver}"/>
        <property name="url" value="${jdbc.url}"/>
        <property name="username" value="${jdbc.username}"/>
        <property name="password" value="${jdbc.password}"/>
    </bean>
</beans>
```

#### 读取单个属性

##### 思路分析

① 在项目中添加BookDao和BookDaoImpl类

② 为BookDaoImpl添加一个name属性并提供setter方法

③ 在jdbc.properties中添加数据注入到bookDao中打印方便查询结果

④ 在applicationContext.xml添加配置完成配置文件加载、属性注入(${key})

##### 代码实现

**① 在项目中添对应的类**

BookDao和BookDaoImpl类，并在BookDaoImpl类中添加`name`属性与setter方法

```java
public interface BookDao {
    public void save();
}

public class BookDaoImpl implements BookDao {
    private String name;

    public void setName(String name) {
        this.name = name;
    }

    public void save() {
        System.out.println("book dao save ..." + name);
    }
}
```

**② 完成配置文件的读取与注入**

```XML
    <context:property-placeholder location="jdbc.properties"/>
    
    <bean id="bookDao" class="com.itheima.dao.impl.BookDaoImpl">
        <property name="name" value="${jdbc.driver}"/>
    </bean>
</beans>
```

##### 当有多个properties配置文件需要被加载，该如何配置?

```XML
    <!--方式一 -->
    <context:property-placeholder location="jdbc.properties,jdbc2.properties" system-properties-mode="NEVER"/>
    <!--方式二-->
    <context:property-placeholder location="*.properties" system-properties-mode="NEVER"/>
    <!--方式三 -->
    <context:property-placeholder location="classpath:*.properties" system-properties-mode="NEVER"/>
    <!--方式四-->
    <context:property-placeholder location="classpath*:*.properties" system-properties-mode="NEVER"/>
</beans>	
```

**说明：**

- 方式一：可以实现，如果配置文件多的话，每个都需要配置
- 方式二：`*.properties`代表所有以properties结尾的文件都会被加载，可以解决方式一的问题，但是不标准
- 方式三：标准的写法，`classpath:`代表的是从根路径下开始查找，但是只能查询当前项目的根路径
- 方式四：不仅可以加载当前项目还可以加载当前项目所依赖的所有项目的根路径下的properties配置文件

### 核心容器

#### Bean的三种获取方式

##### 方式一：

```java
BookDao bookDao = (BookDao) ctx.getBean("bookDao");
```

这种方式存在的问题是每次获取的时候都需要进行类型转换

##### 方式二：

```java
BookDao bookDao = ctx.getBean("bookDao"，BookDao.class);
```

这种方式可以解决类型强转问题，但是参数又多加了一个，相对来说没有简化多少。

##### 方式三：

```java
BookDao bookDao = ctx.getBean(BookDao.class);
```

这种方式就类似我们之前所学习依赖注入中的按类型注入。必须要确保IoC容器中该类型对应的bean对象只能有一个。

#### BeanFactory的使用（了解即可）

##### **使用BeanFactory来创建IoC容器的具体实现方式为**

```java
public class AppForBeanFactory {
    public static void main(String[] args) {
        Resource resources = new ClassPathResource("applicationContext.xml");
        BeanFactory bf = new XmlBeanFactory(resources);
        BookDao bookDao = bf.getBean(BookDao.class);
        bookDao.save();
    }
}
```

##### BeanFactory 和 ApplicationContext 之间的区别

- BeanFactory是延迟加载，只有在获取bean对象的时候才会去创建
- ApplicationContext是立即加载，容器加载的时候就会创建bean对象
- ApplicationContext要想成为延迟加载，只需要按照如下方式进行配置

```XML
    <bean id="bookDao" class="com.itheima.dao.impl.BookDaoImpl"  lazy-init="true"/>
</beans>
```

### IOC / DI 注解开发

#### 注解开发定义bean

##### 代码实现

**① 删除原XML配置**

```XML
<bean id="bookDao" class="com.itheima.dao.impl.BookDaoImpl"/>
```

**② Dao上添加注解**

在BookDaoImpl类上添加`@Component`注解

```java
@Component("bookDao")
public class BookDaoImpl implements BookDao {
    public void save() {
        System.out.println("book dao save ..." );
    }
}
```

**注意：**@Component注解不可以添加在接口上，因为接口是无法创建对象的。

XML与注解配置的对应关系：

<img src="https://i-blog.csdnimg.cn/direct/de48b07919294c2c9265aefc6f926892.png" alt="img" style="zoom:67%;" />

**③ 配置Spring的注解包扫描**

为了让Spring框架能够扫描到写在类上的注解，需要在配置文件上进行包扫描

```XML
    <context:component-scan base-package="com.itheima"/>
</beans>
```

**说明：**

component-scan

- component：组件，Spring将管理的bean视作自己的一个组件
- scan：扫描

base-package指定Spring框架扫描的包路径，它会扫描指定包及其子包中的所有类上的注解。

- 包路径越多[如:com.itheima.dao.impl]，扫描的范围越小速度越快
- 包路径越少[如:com.itheima]，扫描的范围越大速度越慢
- 一般扫描到项目的组织名称即Maven的groupId下[如:com.itheima]即可。

**④ \**Service上添加注解\****

在BookServiceImpl类上也添加`@Component`交给Spring框架管理

```java
@Component
public class BookServiceImpl implements BookService {
    private BookDao bookDao;

    public void setBookDao(BookDao bookDao) {
        this.bookDao = bookDao;
    }

    public void save() {
        System.out.println("book service save ...");
        bookDao.save();
    }
}
```

##### @Component 及其衍生注解

| 名称 | @Component/@Controller/@Service/@Repository |
| ---- | ------------------------------------------- |
| 类型 | 类注解                                      |
| 位置 | 类定义上方                                  |
| 作用 | 设置该类为spring管理的bean                  |
| 属性 | value（默认）：定义bean的id                 |

#### 纯注解开发模式

##### 思路分析

- 将配置文件applicationContext.xml删除掉，使用类来替换。

##### 代码实现

**① 创建配置类**

创建一个配置类`SpringConfig`

```java
public class SpringConfig {
}
```

**② \**标识该类为配置类\****

在配置类上添加`@Configuration`注解，将其标识为一个配置类,替换`applicationContext.xml`

```java
@Configuration
public class SpringConfig {
}
```

**③ 用注解替换包扫描配置**

在配置类上添加包扫描注解`@ComponentScan`替换`<context:component-scan base-package=""/>`

```java
@Configuration
@ComponentScan("com.itheima")
public class SpringConfig {
}
```

**④ 创建运行类并执行**

```java
public class AppForAnnotation {

    public static void main(String[] args) {
        ApplicationContext ctx = new AnnotationConfigApplicationContext(SpringConfig.class);
        BookDao bookDao = (BookDao) ctx.getBean("bookDao");
        System.out.println(bookDao);
        BookService bookService = ctx.getBean(BookService.class);
        System.out.println(bookService);
    }
}
```

##### 执行流程

**① 配置类的作用（替代 xml 文件）**

```java
@Configuration
@ComponentScan("com.itheima")
public class SpringConfig {
}
```

- `@Configuration`注解：相当于给这个类贴上 **“Spring 核心配置文件” 的标签，告诉 Spring 框架：“这个类不是普通的 Java 类，它是用来替代原来的 applicationContext.xml 的配置类”**
- `@ComponentScan("com.itheima")`注解：**告诉 Spring“去`com.itheima`这个包（包括子包）里找所有带`@Component`/`@Service`/`@Repository`的类”**

**② 运行类的执行流程（核心）**

```java
public class AppForAnnotation {
    public static void main(String[] args) {
        // 1. 初始化Spring容器，加载配置类
        ApplicationContext ctx = new AnnotationConfigApplicationContext(SpringConfig.class);
        // 2. 从容器中获取BookDao对象
        BookDao bookDao = (BookDao) ctx.getBean("bookDao");
        System.out.println(bookDao);
        // 3. 从容器中获取BookService对象
        BookService bookService = ctx.getBean(BookService.class);
        System.out.println(bookService);
    }
}
```

**逐行拆解执行逻辑：**

```
ApplicationContext ctx = new AnnotationConfigApplicationContext(SpringConfig.class);
```

- 第一步：识别`SpringConfig`类上的`@Configuration`注解，确认这是核心配置类；
- 第二步：读取`@ComponentScan("com.itheima")`，去指定包下扫描所有带注解的类（比如`BookDao`带`@Repository`、`BookService`带`@Service`）；
- 第三步：自动创建这些类的实例（对象），并把对象存入 Spring 的 “容器”（ApplicationContext）中管理

##### @Configuration、@ComponentScan

**知识点1：@Configuration**

| 名称 | @Configuration              |
| ---- | --------------------------- |
| 类型 | 类注解                      |
| 位置 | 类定义上方                  |
| 作用 | 设置该类为spring配置类      |
| 属性 | value（默认）：定义bean的id |

**知识点2：@ComponentScan**

| 名称 | @ComponentScan                                           |
| ---- | -------------------------------------------------------- |
| 类型 | 类注解                                                   |
| 位置 | 类定义上方                                               |
| 作用 | 设置spring配置类扫描路径，用于加载使用注解格式定义的bean |
| 属性 | value（默认）：扫描路径，此路径可以逐层向下扫描          |

### **注解开发依赖注入**

#### 注解实现按照名称注入

(1) 当根据类型在容器中找到多个bean,注入参数的属性名又和容器中bean的名称不一致，这个时候该如何解决，就需要使用到`@Qualifier`来指定注入哪个名称的bean对象。

```java
@Service
public class BookServiceImpl implements BookService {
    @Autowired
    @Qualifier("bookDao1")
    private BookDao bookDao;
    
    public void save() {
        System.out.println("book service save ...");
        bookDao.save();
    }
}
```

@Qualifier注解后的值就是需要注入的bean的名称。

**注意：**@Qualifier不能独立使用，必须和@Autowired一起使用

#### 简单数据类型注入

##### 使用`@Value`注解，将值写入注解的参数中

```java
@Repository("bookDao")
public class BookDaoImpl implements BookDao {
    @Value("itheima")
    private String name;
    public void save() {
        System.out.println("book dao save ..." + name);
    }
}
```

##### 注解读取properties配置文件

`@Value`一般会被用在从properties配置文件中读取内容进行使用

**① resource下准备properties文件**

jdbc.properties

```java
name=itheima888
```

**② 使用注解加载properties配置文件**

在配置类上添加`@PropertySource`注解

```java
@Configuration
@ComponentScan("com.itheima")
@PropertySource("jdbc.properties")
public class SpringConfig {
}
```

**③ 使用@Value读取配置文件中的内容**

```java
@Repository("bookDao")
public class BookDaoImpl implements BookDao {
    @Value("${name}")
    private String name;
    public void save() {
        System.out.println("book dao save ..." + name);
    }
}
```

### 注册开发管理第三方bean

#### 注解开发管理第三方bean

##### 代码实现

**① 在配置类中添加一个方法（后续里面的数据库信息会用另外一个类承接）**

注意该方法的返回值就是要创建的Bean对象类型

```java
@Configuration
public class SpringConfig {
    public DataSource dataSource(){
        DruidDataSource ds = new DruidDataSource();
        ds.setDriverClassName("com.mysql.jdbc.Driver");
        ds.setUrl("jdbc:mysql://localhost:3306/spring_db");
        ds.setUsername("root");
        ds.setPassword("root");
        return ds;
    }
}
```

`DataSource` 是 `javax.sql` 包下的一个**接口**，它是 Java 官方定义的 “数据源” 标准规范，核心作用是：

- 统一管理数据库连接（替代传统的 `DriverManager`）
- 支持连接池技术，复用数据库连接，提升性能

**② 在方法上添加`@Bean`注解**

@Bean注解的作用是将方法的返回值制作为Spring管理的一个bean对象

```java
@Configuration
public class SpringConfig {
	@Bean
    public DataSource dataSource(){
        DruidDataSource ds = new DruidDataSource();
        ds.setDriverClassName("com.mysql.jdbc.Driver");
        ds.setUrl("jdbc:mysql://localhost:3306/spring_db");
        ds.setUsername("root");
        ds.setPassword("root");
        return ds;
    }
}
```

#### 引入外部配置类

##### 使用`@Import`引入

这种方案可以不用加`@Configuration`注解，但是必须在Spring配置类上使用`@Import`注解手动引入需要

加载的配置类

**① 去除JdbcConfig类上的注解**

```java
public class JdbcConfig {
	@Bean
    public DataSource dataSource(){
        DruidDataSource ds = new DruidDataSource();
        ds.setDriverClassName("com.mysql.jdbc.Driver");
        ds.setUrl("jdbc:mysql://localhost:3306/spring_db");
        ds.setUsername("root");
        ds.setPassword("root");
        return ds;
    }
}
```

**② 在Spring配置类中引入**

```java
@Configuration
//@ComponentScan("com.itheima.config")
@Import({JdbcConfig.class})
public class SpringConfig {
	
}
```

### 注解开发实现为第三方bean注入资源

#### 简单数据类型

##### 代码实现

**① 类中提供四个属性**

```java
public class JdbcConfig {
    private String driver;
    private String url;
    private String userName;
    private String password;
	@Bean
    public DataSource dataSource(){
        DruidDataSource ds = new DruidDataSource();
        ds.setDriverClassName("com.mysql.jdbc.Driver");
        ds.setUrl("jdbc:mysql://localhost:3306/spring_db");
        ds.setUsername("root");
        ds.setPassword("root");
        return ds;
    }
}
```

**② 使用`@Value`注解引入值**

```java
public class JdbcConfig {
    @Value("com.mysql.jdbc.Driver")
    private String driver;
    @Value("jdbc:mysql://localhost:3306/spring_db")
    private String url;
    @Value("root")
    private String userName;
    @Value("password")
    private String password;
	@Bean
    public DataSource dataSource(){
        DruidDataSource ds = new DruidDataSource();
        ds.setDriverClassName(driver);
        ds.setUrl(url);
        ds.setUsername(userName);
        ds.setPassword(password);
        return ds;
    }
}
```

#### 引用数据类型

##### 需求分析

假设在构建DataSource对象的时候，需要用到BookDao对象，该如何把BookDao对象注入进方法内让其使用呢?

##### 代码实现

**① 在SpringConfig中扫描BookDao**

扫描的目的是让Spring能管理到BookDao,也就是说要让IoC容器中有一个bookDao对象

```java
@Configuration
@ComponentScan("com.itheima.dao")
@Import({JdbcConfig.class})
public class SpringConfig {
}
```

**② 在JdbcConfig类的方法上添加参数**

```java
@Bean
public DataSource dataSource(BookDao bookDao){
    System.out.println(bookDao);
    DruidDataSource ds = new DruidDataSource();
    ds.setDriverClassName(driver);
    ds.setUrl(url);
    ds.setUsername(userName);
    ds.setPassword(password);
    return ds;
}
```

##### 执行流程

① 识别 `SpringConfig` 上的 `@Configuration`，确认这是主配置。

② 执行 `@ComponentScan("com.itheima.dao")`：

- 去 `com.itheima.dao` 包下扫描，找到 `BookDaoImpl`（它上面有 `@Repository` 或 `@Component` 注解）。
- 自动创建 `BookDaoImpl` 对象，作为 `bookDao` Bean 存入 IoC 容器。

③ 执行 `@Import(JdbcConfig.class)`：

- 主动加载 `JdbcConfig` 类，准备解析它里面的 `@Bean` 方法。

④ Spring 发现这个方法需要一个 `BookDao` 类型的参数。

⑤ 它会去 IoC 容器中查找：“有没有类型为 `BookDao` 的 Bean？”找到之前扫描创建的 `bookDao` 对象，确认可以作为参数传入。

### Spring 整合 MyBatis

#### 代码实现

##### 创建Spring的主配置类

```java
//配置类注解
@Configuration
//包扫描，主要扫描的是项目中的AccountServiceImpl类
@ComponentScan("com.itheima")
public class SpringConfig {
}
```

##### 创建数据源的配置类

在**配置类**中完成数据源的创建

```java
public class JdbcConfig {
    @Value("${jdbc.driver}")
    private String driver;
    @Value("${jdbc.url}")
    private String url;
    @Value("${jdbc.username}")
    private String userName;
    @Value("${jdbc.password}")
    private String password;

    @Bean
    public DataSource dataSource(){
        DruidDataSource ds = new DruidDataSource();
        ds.setDriverClassName(driver);
        ds.setUrl(url);
        ds.setUsername(userName);
        ds.setPassword(password);
        return ds;
    }
}
```

##### 主配置类中读properties并引入数据源配置类

```java
@Configuration
@ComponentScan("com.itheima")
@PropertySource("classpath:jdbc.properties")
@Import(JdbcConfig.class)
public class SpringConfig {
}
```

##### 创建Mybatis配置类并配置SqlSessionFactory

```java
public class MybatisConfig {
    //定义bean，SqlSessionFactoryBean，用于产生SqlSessionFactory对象
    @Bean
    public SqlSessionFactoryBean sqlSessionFactory(DataSource dataSource){
        SqlSessionFactoryBean ssfb = new SqlSessionFactoryBean();
        //设置模型类的别名扫描
        ssfb.setTypeAliasesPackage("com.itheima.domain");
        //设置数据源
        ssfb.setDataSource(dataSource);
        return ssfb;
    }
    //定义bean，返回MapperScannerConfigurer对象
    @Bean
    public MapperScannerConfigurer mapperScannerConfigurer(){
        MapperScannerConfigurer msc = new MapperScannerConfigurer();
        msc.setBasePackage("com.itheima.dao");
        return msc;
    }
}
```

**说明：**

① 使用SqlSessionFactoryBean封装SqlSessionFactory需要的环境信息

<img src="https://i-blog.csdnimg.cn/direct/57fa35723ade4af98020dc7cec388443.png" alt="img" style="zoom:50%;" />

图里的代码，其实就是把 XML 配置里的关键部分 “翻译” 成了 Java 方法调用：

| 原生 MyBatis XML 配置 | Spring Java 配置 (SqlSessionFactoryBean)      | 作用                                            |
| --------------------- | --------------------------------------------- | ----------------------------------------------- |
| `<typeAliases>`       | `setTypeAliasesPackage("com.itheima.domain")` | 为实体类设置别名，简化 SQL 映射文件中的类名书写 |
| `<dataSource>`        | `setDataSource(dataSource)`                   | 注入数据源，MyBatis 用它来建立数据库连接        |

② 为什么 dataSource 参数不用自己 new？

这是 Spring 的依赖注入（DI）特性在起作用：

- 你的项目里肯定已经配置了一个 Druid 数据源（`DruidDataSource`），并且它已经被注册成了一个 Spring Bean。
- 当 Spring 初始化 `sqlSessionFactory()` 这个方法时，发现它需要一个 `DataSource` 类型的参数，就会自动在容器里寻找一个符合类型的 Bean（也就是你的 Druid 数据源），并自动注入进来。

③ 使用MapperScannerConfigurer加载Dao接口，创建代理对象保存到IoC容器中

<img src="https://i-blog.csdnimg.cn/direct/1a1579d6bd1e4700b04ddb3a6af70a8d.png" alt="img" style="zoom:50%;" />

##### **主配置类中引入Mybatis配置类**

```java
@Configuration
@ComponentScan("com.itheima")
@PropertySource("classpath:jdbc.properties")
@Import({JdbcConfig.class,MybatisConfig.class})
public class SpringConfig {
}
```

#### 执行流程

##### 执行`new AnnotationConfigApplicationContext(SpringConfig.class)`时，Spring 开始启动：

- `@ComponentScan("com.itheima")`：扫描指定包下所有带`@Service`/`@Repository`等注解的类，准备创建 Bean；
- `@PropertySource("classpath:jdbc.properties")`：加载数据库配置文件，读取`jdbc.driver`/`url`等配置项；
- `@Import(...)`：导入数据源配置类（`JdbcConfig`）和 MyBatis 配置类（`MybatisConfig`），触发这两个类的解析。

### Spring 整合 Junit

#### 代码实现

##### 编写测试类

在test \ java下创建一个AccountServiceTest

```java
//设置类运行器
@RunWith(SpringJUnit4ClassRunner.class)
//设置Spring环境对应的配置类
@ContextConfiguration(classes = {SpringConfiguration.class}) //加载配置类
//@ContextConfiguration(locations={"classpath:applicationContext.xml"})//加载配置文件
public class AccountServiceTest {
    //支持自动装配注入bean
    @Autowired
    private AccountService accountService;
    @Test
    public void testFindById(){
        System.out.println(accountService.findById(1));

    }
    @Test
    public void testFindAll(){
        System.out.println(accountService.findAll());
    }
}
```

**核心逻辑：**

**①** **@RunWith(SpringJUnit4ClassRunner.class)**

- **作用**：指定用 Spring 提供的专用类运行器来执行测试。
- 为什么需要它：
  - 普通的 JUnit 运行器只会执行你的测试方法，不会启动 Spring 容器。
  - 这个特殊的运行器会先**启动 Spring 容器**，然后再运行你的测试方法，这样 Spring 的所有功能（如`@Autowired`）才能生效。

**②** **@ContextConfiguration(classes = {SpringConfiguration.class})**

- **作用**：告诉 Spring 容器，应该加载哪些配置来创建 Bean。
- `classes`：如果你的配置是用 Java 类写的（比如`@Configuration`注解的类），就用这个属性，指定配置类。
- `locations`：如果你的配置是用 XML 文件写的（比如`applicationContext.xml`），就用这个属性，指定 XML 文件路径。

#### 知识点

##### @RunWith

| 名称 | @RunWith                          |
| ---- | --------------------------------- |
| 类型 | 测试类注解                        |
| 位置 | 测试类定义上方                    |
| 作用 | 设置JUnit运行器                   |
| 属性 | value（默认）：运行所使用的运行期 |

##### @ContextConfiguration

| 名称 | @ContextConfiguration                                        |
| ---- | ------------------------------------------------------------ |
| 类型 | 测试类注解                                                   |
| 位置 | 测试类定义上方                                               |
| 作用 | 设置JUnit加载的Spring核心配置                                |
| 属性 | classes：核心配置类，可以使用数组的格式设定加载多个配置类 locations:配置文件，可以使用数组的格式设定加载多个配置文件名称 |

### AOP 核心概念

#### 连接点

程序执行过程中的任意位置，粒度为执行方法、抛出异常、设置变量等。在SpringAOP中，理解为方法的执行，可以直接理解成所有的方法

#### 切入点

匹配连接点的式子，在SpringAOP中，一个切入点可以描述一个具体方法，也可也匹配多个方法。

连接点范围要比切入点范围大，是切入点的方法也一定是连接点，但是是连接点的方法就不一定要被增强，所以可能不是切入点。

#### 通知

在切入点处执行的操作，也就是共性功能。在SpringAOP中，功能最终以方法的形式呈现

#### 通知类

定义通知的类

#### 切面

描述通知与切入点的对应关系。

<img src="https://i-blog.csdnimg.cn/direct/b8b1872b6deb46238376be8710807c36.png" alt="img" style="zoom:50%;" />

### AOP 入门案例

#### 代码实现

##### 定义通知类和通知

```java
public class MyAdvice {
    public void method(){
        System.out.println(System.currentTimeMillis());
    }
}
```

##### 定义切入点

```java
public class MyAdvice {
    @Pointcut("execution(void com.itheima.dao.BookDao.update())")
    private void pt(){}
    public void method(){
        System.out.println(System.currentTimeMillis());
    }
}
```

- 切入点定义依托一个**不具有实际意义的方法进行，**即无参数、无返回值、方法体无实际逻辑。

##### 制作切面

```java
public class MyAdvice {
    @Pointcut("execution(void com.itheima.dao.BookDao.update())")
    private void pt(){}
    
    @Before("pt()")
    public void method(){
        System.out.println(System.currentTimeMillis());
    }
}
```

绑定切入点与通知关系，并指定通知添加到原始连接点的具体执行位置

<img src="https://i-blog.csdnimg.cn/direct/3d57a2960d194c68a4238210e4b372d0.png" alt="img" style="zoom:50%;" />

**说明：**@Before翻译过来是之前，也就是说通知会在切入点方法执行之前执行

##### 将通知类配给容器并标识其为切面类

```java
@Component
@Aspect
public class MyAdvice {
    @Pointcut("execution(void com.itheima.dao.BookDao.update())")
    private void pt(){}
    
    @Before("pt()")
    public void method(){
        System.out.println(System.currentTimeMillis());
    }
}
```

##### 开启注解格式AOP功能

```java
@Configuration
@ComponentScan("com.itheima")
@EnableAspectJAutoProxy
public class SpringConfig {
}
```

#### 知识点

##### @EnableAspectJAutoProxy

| 名称 | @EnableAspectJAutoProxy |
| ---- | ----------------------- |
| 类型 | 配置类注解              |
| 位置 | 配置类定义上方          |
| 作用 | 开启注解格式AOP功能     |

##### @Aspect

| 名称 | @Aspect               |
| ---- | --------------------- |
| 类型 | 类注解                |
| 位置 | 切面类定义上方        |
| 作用 | 设置当前类为AOP切面类 |

##### @Pointcut

| 名称 | @Pointcut                   |
| ---- | --------------------------- |
| 类型 | 方法注解                    |
| 位置 | 切入点方法定义上方          |
| 作用 | 设置切入点方法              |
| 属性 | value（默认）：切入点表达式 |

### AOP 配置管理

#### 切入点表达式

##### 语法格式

> execution(访问修饰符 返回值 包名.类/接口名.方法名(参数) 异常名）

##### 示例

```java
execution(public User com.itheima.service.UserService.findById(int))
```

- execution：动作关键字，描述切入点的行为动作，例如execution表示执行到指定切入点
- public：访问修饰符,还可以是public，private等，可以省略
- User：返回值，写返回值类型
- com.itheima.service：包名，多级包使用点连接
- UserService：类/接口名称
- findById：方法名
- int：参数，直接写参数的类型，多个类型用逗号隔开
- 异常名：方法定义中抛出指定异常，可以省略

##### 通配符

① `*：`单个独立的任意符号，可以独立出现，也可以作为前缀或者后缀的匹配符出现

```java
execution（public * com.itheima.*.UserService.find*(*))
```

② `..`：多个连续的任意符号，可以独立出现，常用于简化包名与参数的书写

```java
execution（public User com..UserService.findById(..))
```

匹配com包下的任意包中的UserService类或接口中所有名称为findById的方法

##### 书写技巧

① 描述切入点通**常描述接口**，而不描述实现类，如果描述到实现类，就出现紧耦合了

② 访问控制修饰符针对接口开发均采用public描述（**可省略访问控制修饰符描述**）

③ 通常**不使用异常**作为**匹配**规则

④ **接口名/类名**书写名称与模块相关的**采用\*匹配**，例如UserService书写成*Service，绑定业务层接口名

#### AOP 通知类型

##### AOP通知共分为5种类型

- 前置通知
- 后置通知
- **环绕通知(重点)**
- 返回后通知(了解)
- 抛出异常后通知(了解)

##### 通知类型的使用

**① 前置通知**

修改MyAdvice，在before方法上添加`@Before注解`

```java
@Component
@Aspect
public class MyAdvice {
    @Pointcut("execution(void com.itheima.dao.BookDao.update())")
    private void pt(){}
    
    @Before("pt()")
    //此处也可以写成 @Before("MyAdvice.pt()"),不建议
    public void before() {
        System.out.println("before advice ...");
    }
}
```

**② 后置通知**

```java
@Component
@Aspect
public class MyAdvice {
    @Pointcut("execution(void com.itheima.dao.BookDao.update())")
    private void pt(){}
    
    @Before("pt()")
    public void before() {
        System.out.println("before advice ...");
    }
    @After("pt()")
    public void after() {
        System.out.println("after advice ...");
    }
}
```

**③ 环绕通知**

```java
@Component
@Aspect
public class MyAdvice {
    @Pointcut("execution(void com.itheima.dao.BookDao.update())")
    private void pt(){}
    
    @Pointcut("execution(int com.itheima.dao.BookDao.select())")
    private void pt2(){}
    
    @Around("pt2()")
    public Object aroundSelect(ProceedingJoinPoint pjp) throws Throwable {
        System.out.println("around before advice ...");
        //表示对原始操作的调用
        Object ret = pjp.proceed();
        System.out.println("around after advice ...");
        return ret;
    }
}
```

**说明：**

- 为什么返回的是Object而不是int的**主要原因是Object类型更通用。**
- 在环绕通知中是可以对原始方法返回值就行修改的。

##### 环绕通知注意事项

① 环绕通知必须依赖形参ProceedingJoinPoint才能实现对原始方法的调用，进而实现原始方法调用前后同时添加通知

② 通知中如果未使用ProceedingJoinPoint对原始方法进行调用将跳过原始方法的执行

③ 对原始方法的调用可以不接收返回值，通知方法设置成void即可，如果接收返回值，最好设定为Object类型

#### 业务层接口执行效率

##### 需求分析

任意业务层接口执行均可显示其执行效率（执行时长）

##### 代码实现

**① 开启SpringAOP的注解功能**

在Spring的主配置文件SpringConfig类中添加注解

```java
@EnableAspectJAutoProxy
```

**② 创建AOP的通知类**

- 该类要被Spring管理，需要添加@Component
- 要标识该类是一个AOP的切面类，需要添加@Aspect
- 配置切入点表达式，需要添加一个方法，并添加@Pointcut

```java
@Component
@Aspect
public class ProjectAdvice {
    //配置业务层的所有方法
    @Pointcut("execution(* com.itheima.service.*Service.*(..))")
    private void servicePt(){}
    
    public void runSpeed(){
        
    } 
}
```

**③ 添加环绕通知**

在runSpeed()方法上添加@Around

```java
@Component
@Aspect
public class ProjectAdvice {
    //配置业务层的所有方法
    @Pointcut("execution(* com.itheima.service.*Service.*(..))")
    private void servicePt(){}
    //@Around("ProjectAdvice.servicePt()") 可以简写为下面的方式
    @Around("servicePt()")
    public Object runSpeed(ProceedingJoinPoint pjp){
        Object ret = pjp.proceed();
        return ret;
    } 
}
```

**④ 完成核心业务，记录万次执行的时间**

```java
@Component
@Aspect
public class ProjectAdvice {
    //配置业务层的所有方法
    @Pointcut("execution(* com.itheima.service.*Service.*(..))")
    private void servicePt(){}
    //@Around("ProjectAdvice.servicePt()") 可以简写为下面的方式
    @Around("servicePt()")
    public void runSpeed(ProceedingJoinPoint pjp){
        
        long start = System.currentTimeMillis();
        for (int i = 0; i < 10000; i++) {
           pjp.proceed();
        }
        long end = System.currentTimeMillis();
        System.out.println("业务层接口万次执行时间: "+(end-start)+"ms");
    } 
}
```

**⑤ 程序优化**

目前程序所面临的问题是，多个方法一起执行测试的时候，控制台都打印的是：

```
业务层接口万次执行时间:xxxms
```

我们没有办法区分到底是哪个接口的哪个方法执行的具体时间，具体如何优化?

```java
@Component
@Aspect
public class ProjectAdvice {
    //配置业务层的所有方法
    @Pointcut("execution(* com.itheima.service.*Service.*(..))")
    private void servicePt(){}
    //@Around("ProjectAdvice.servicePt()") 可以简写为下面的方式
    @Around("servicePt()")
    public void runSpeed(ProceedingJoinPoint pjp){
        //获取执行签名信息
        Signature signature = pjp.getSignature();
        //通过签名获取执行操作名称(接口名)
        String className = signature.getDeclaringTypeName();
        //通过签名获取执行操作名称(方法名)
        String methodName = signature.getName();
        
        long start = System.currentTimeMillis();
        for (int i = 0; i < 10000; i++) {
           pjp.proceed();
        }
        long end = System.currentTimeMillis();
        System.out.println("万次执行："+ className+"."+methodName+"---->" +(end-start) + "ms");
    } 
}
```

### AOP通知获取数据

#### 返回后通知获取返回值

```java
@Component
@Aspect
public class MyAdvice {
    @Pointcut("execution(* com.itheima.dao.BookDao.findName(..))")
    private void pt(){}

    @AfterReturning(value = "pt()",returning = "ret")
    public void afterReturning(Object ret) {
        System.out.println("afterReturning advice ..."+ret);
    }
	//其他的略
}
```

**注意：**

##### **参数名的问题**

![img](https://i-blog.csdnimg.cn/direct/b8cdaab9556a4f58a57e26d48fc793c5.png)

#### **afterReturning方法参数类型的问题**

参数类型可以写成String，但是为了能匹配更多的参数类型，建议写成Object类型

##### **afterReturning方法参数的顺序问题**

![img](https://i-blog.csdnimg.cn/direct/da50c67c8e0f41618098e690e18c8a6a.png)

##### 为什么这里必须显示写上 value = "pt( )"

- 所有注解的核心属性都会命名为`value`；
- 如果给注解赋值时，**只给 value 属性赋值**，没有其他属性需要设置，就可以省略`value=`，直接写值；
- 如果需要给多个属性赋值（比如同时给`value`和`returning`赋值），就必须显式写出所有属性名，不能省略。

### 百度网盘密码数据兼容处理

#### 开启SpringAOP的注解功能

```java
@Configuration
@ComponentScan("com.itheima")
@EnableAspectJAutoProxy
public class SpringConfig {
}
```

#### 编写通知类

```java
@Component
@Aspect
public class DataAdvice {
    @Pointcut("execution(boolean com.itheima.service.*Service.*(*,*))")
    private void servicePt(){}
    
}
```

#### 添加环绕通知

```java
@Component
@Aspect
public class DataAdvice {
    @Pointcut("execution(boolean com.itheima.service.*Service.*(*,*))")
    private void servicePt(){}
    
    @Around("DataAdvice.servicePt()")
    // @Around("servicePt()")这两种写法都对
    public Object trimStr(ProceedingJoinPoint pjp) throws Throwable {
        Object ret = pjp.proceed();
        return ret;
    }
    
}
```

#### 完成核心业务，处理参数中的空格

```java
@Component
@Aspect
public class DataAdvice {
    @Pointcut("execution(boolean com.itheima.service.*Service.*(*,*))")
    private void servicePt(){}
    
    @Around("DataAdvice.servicePt()")
    // @Around("servicePt()")这两种写法都对
    public Object trimStr(ProceedingJoinPoint pjp) throws Throwable {
        //获取原始方法的参数
        Object[] args = pjp.getArgs();
        for (int i = 0; i < args.length; i++) {
            //判断参数是不是字符串
            if(args[i].getClass().equals(String.class)){
                args[i] = args[i].toString().trim();
            }
        }
        //将修改后的参数传入到原始方法的执行中
        Object ret = pjp.proceed(args);
        return ret;
    }
    
}
```

### AOP事务管理

#### 需求分析

(1) 需求：实现任意两个账户间转账操作

(2) 需求微缩：A账户减钱，B账户加钱

#### 代码实现

##### 在需要被事务管理的方法上添加注解

```java
public interface AccountService {
    /**
     * 转账操作
     * @param out 传出方
     * @param in 转入方
     * @param money 金额
     */
    //配置当前接口方法具有事务
    public void transfer(String out,String in ,Double money) ;
}

@Service
public class AccountServiceImpl implements AccountService {

    @Autowired
    private AccountDao accountDao;
	@Transactional
    public void transfer(String out,String in ,Double money) {
        accountDao.outMoney(out,money);
        int i = 1/0;
        accountDao.inMoney(in,money);
    }

}
```

##### 在JdbcConfig类中配置事务管理器

```java
public class JdbcConfig {
    @Value("${jdbc.driver}")
    private String driver;
    @Value("${jdbc.url}")
    private String url;
    @Value("${jdbc.username}")
    private String userName;
    @Value("${jdbc.password}")
    private String password;

    @Bean
    public DataSource dataSource(){
        DruidDataSource ds = new DruidDataSource();
        ds.setDriverClassName(driver);
        ds.setUrl(url);
        ds.setUsername(userName);
        ds.setPassword(password);
        return ds;
    }

    //配置事务管理器，mybatis使用的是jdbc事务
    @Bean
    public PlatformTransactionManager transactionManager(DataSource dataSource){
        DataSourceTransactionManager transactionManager = new DataSourceTransactionManager();
        transactionManager.setDataSource(dataSource);
        return transactionManager;
    }
}
```

**注意：**事务管理器要根据使用技术进行选择，Mybatis框架使用的是JDBC事务，可以直接使用`DataSourceTransactionManager`

#### 

##### 开启事务注解

在SpringConfig的配置类中开启

```java
@Configuration
@ComponentScan("com.itheima")
@PropertySource("classpath:jdbc.properties")
@Import({JdbcConfig.class,MybatisConfig.class
//开启注解式事务驱动
@EnableTransactionManagement
public class SpringConfig {
}
```

#### Spring事务属性

##### 事务配置

<img src="https://i-blog.csdnimg.cn/direct/319c60b9456b4a35b95f902a6b40f55b.png" alt="img" style="zoom:50%;" />

上面这些属性都可以在`@Transactional`注解的参数上进行设置。

① readOnly：true只读事务，false读写事务，增删改要设为false，查询设为true。

② timeout：设置超时时间单位秒，在多长时间之内事务没有提交成功就自动回滚，-1表示不设置超时时间。

③ rollbackFor：当出现指定异常进行事务回滚

##### **转账业务追加日志案例**

**① 需求分析**

- 需求：实现任意两个账户间转账操作，并对每次转账操作在数据库进行留痕
- 需求微缩：A账户减钱，B账户加钱，数据库记录日志

**② 代码实现**

**1). 添加LogDao接口**

```java
public interface LogDao {
    @Insert("insert into tbl_log (info,createDate) values(#{info},now())")
    void log(String info);
}
```

**2). 添加LogService接口与实现类**

```java
public interface LogService {
    void log(String out, String in, Double money);
}
@Service
public class LogServiceImpl implements LogService {

    @Autowired
    private LogDao logDao;
	@Transactional
    public void log(String out,String in,Double money ) {
        logDao.log("转账操作由"+out+"到"+in+",金额："+money);
    }
}
```

**3). 在转账的业务中添加记录日志**

```java
@Service
public class LogServiceImpl implements LogService {

    @Autowired
    private LogDao logDao;
	//propagation设置事务属性：传播行为设置为当前操作需要新事务
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(String out,String in,Double money ) {
        logDao.log("转账操作由"+out+"到"+in+",金额："+money);
    }
}
```

##### 关于@Transactional

`@Transactional`是**事务管理注解**，核心作用是控制业务层的数据库操作原子性，因此**只应该写在业务层（Service 层）**，**且优先写在「实现类 / 实现类方法」上，绝对不要写在 Controller 层或 DAO 层。**

##### 事务的传播行为

<img src="https://i-blog.csdnimg.cn/direct/c3b1527555ef4eeb9158278c0acd4cdd.png" alt="img" style="zoom: 50%;" />

看前两个就行

