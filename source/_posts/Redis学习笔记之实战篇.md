---
title: Redis学习笔记之实战篇
date: 2026-03-29 11:00:00
categories:
  - Redis
tags:
  - Redis
cover: /img/redis-shizhan.jpg
---

## 实战篇

### 短信登录

#### 1. 思路分析

**发送验证码：**

用户在提交手机号后，会校验手机号是否合法，如果不合法，则要求用户重新输入手机号。如果手机号合法，后台此时生成对应的验证码，同时将验证码进行保存，然后再通过短信的方式将验证码发送给用户。

**短信验证码登录、注册：**

用户将验证码和手机号进行输入，后台从session中拿到当前验证码，然后和用户输入的验证码进行校验，如果不一致，则无法通过校验，如果一致，则后台根据手机号查询用户，如果用户不存在，则为用户创建账号信息，保存到数据库，无论是否存在，都会将用户信息保存到session中，方便后续获得当前登录信息。

**校验登录状态：**

用户在请求时候，会从cookie中携带者JsessionId到后台，后台通过JsessionId从session中拿到用户信息，如果没有session信息，则进行拦截，如果有session信息，则将用户信息保存到threadLocal中，并且放行。

<img src="https://i-blog.csdnimg.cn/direct/f772e3bfc10d4593b05301c90bfd1929.png" alt="img" style="zoom:67%;" />

#### 2. 实现发送短信验证码功能

发送验证码

```java
    @Override
    public Result sendCode(String phone, HttpSession session) {
        // 1.校验手机号
        if (RegexUtils.isPhoneInvalid(phone)) {
            // 2.如果不符合，返回错误信息
            return Result.fail("手机号格式错误！");
        }
        // 3.符合，生成验证码
        String code = RandomUtil.randomNumbers(6);

        // 4.保存验证码到 session
        session.setAttribute("code",code);
        // 5.发送验证码
        log.debug("发送短信验证码成功，验证码：{}", code);
        // 返回ok
        return Result.ok();
    }
```

**说明：**

① `session.setAttribute("code", code)`：核心是「保存校验凭证，实现用户绑定」

当用户输入手机号 + 验证码提交登录时，后端会执行 `session.getAttribute("code")`，取出这里存的验证码，和用户输入的对比 ——**没有这行存储，后续登录就没有 “基准值” 可校验**。

② `log.debug("发送短信验证码成功，验证码：{}", code)`：核心是「调试排查，记录运行状态」

`{}`：SLF4J 的**占位符**，会自动把后面的 `code` 变量值替换到这个位置（比如最终打印：`发送短信验证码成功，验证码：123456`）。

登录

```java
    @Override
    public Result login(LoginFormDTO loginForm, HttpSession session) {
        // 1.校验手机号
        String phone = loginForm.getPhone();
        if (RegexUtils.isPhoneInvalid(phone)) {
            // 2.如果不符合，返回错误信息
            return Result.fail("手机号格式错误！");
        }
        // 3.校验验证码
        Object cacheCode = session.getAttribute("code");
        String code = loginForm.getCode();
        if(cacheCode == null || !cacheCode.toString().equals(code)){
             //3.不一致，报错
            return Result.fail("验证码错误");
        }
        //一致，根据手机号查询用户
        User user = query().eq("phone", phone).one();

        //5.判断用户是否存在
        if(user == null){
            //不存在，则创建
            user =  createUserWithPhone(phone);
        }
        //7.保存用户信息到session中
        session.setAttribute("user",user);

        return Result.ok();
    }
```

**说明：**

① 为什么校验的时候，要将cacheCode.toString()，不能直接比较？

- `session.getAttribute("code")` 的返回值是 `Object` 类型（这是 `HttpSession` API 的设计），所以变量 `cacheCode` 被声明为 `Object`。
- `loginForm.getCode()` 返回的是 `String` 类型，变量 `code` 是 `String`。

② User user = query().eq("phone", phone).one(); query()的作用是什么？

- 这是 MyBatis-Plus 提供的一个方法，通常在继承了 `ServiceImpl` 的 Service 层类中使用。
- 它的作用是：**创建并返回一个 `QueryWrapper` 查询条件构造器**。

#### 3. 实现登录拦截功能

拦截器代码

```java
public class LoginInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
       //1.获取session
        HttpSession session = request.getSession();
        //2.获取session中的用户
        Object user = session.getAttribute("user");
        //3.判断用户是否存在
        if(user == null){
              //4.不存在，拦截，返回401状态码
              response.setStatus(401);
              return false;
        }
        //5.存在，保存用户信息到Threadlocal
        UserHolder.saveUser((User)user);
        //6.放行
        return true;
    }
}
```

**说明：**

在 `LoginInterceptor` 的 `preHandle` 方法中，当判断用户已登录后，会调用 `UserHolder.saveUser(...)`，将用户信息存入**当前处理请求的线程**的 `ThreadLocal` 中。

让拦截器生效

```java
@Configuration
public class MvcConfig implements WebMvcConfigurer {

    @Resource
    private StringRedisTemplate stringRedisTemplate;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // 登录拦截器
        registry.addInterceptor(new LoginInterceptor())
                .excludePathPatterns(
                        "/shop/**",
                        "/voucher/**",
                        "/shop-type/**",
                        "/upload/**",
                        "/blog/hot",
                        "/user/code",
                        "/user/login"
                ).order(1);
        // token刷新的拦截器
        registry.addInterceptor(new RefreshTokenInterceptor(stringRedisTemplate)).addPathPatterns("/**").order(0);
    }
}
```

#### 4. Redis代替session的业务流程

思路分析

当注册完成后，用户去登录会去校验用户提交的手机号和验证码，是否一致。如果一致，则根据手机号查询用户信息，不存在则新建，最后将用户数据保存到redis，并且生成token作为redis的key。当我们校验用户是否登录时，会去携带着token进行访问，从redis中取出token对应的value，判断是否存在这个数据，如果没有则拦截，如果存在则将其保存到threadLocal中，并且放行。

<img src="https://i-blog.csdnimg.cn/direct/39c883f684cc481f90d53da2f2159e76.png" alt="img" style="zoom: 50%;" />

代码实现

**UserServiceImpl代码**

```java
@Override
public Result login(LoginFormDTO loginForm, HttpSession session) {
    // 1.校验手机号
    String phone = loginForm.getPhone();
    if (RegexUtils.isPhoneInvalid(phone)) {
        // 2.如果不符合，返回错误信息
        return Result.fail("手机号格式错误！");
    }
    // 3.从redis获取验证码并校验
    String cacheCode = stringRedisTemplate.opsForValue().get(LOGIN_CODE_KEY + phone);
    String code = loginForm.getCode();
    if (cacheCode == null || !cacheCode.equals(code)) {
        // 不一致，报错
        return Result.fail("验证码错误");
    }

    // 4.一致，根据手机号查询用户 select * from tb_user where phone = ?
    User user = query().eq("phone", phone).one();

    // 5.判断用户是否存在
    if (user == null) {
        // 6.不存在，创建新用户并保存
        user = createUserWithPhone(phone);
    }

    // 7.保存用户信息到 redis中
    // 7.1.随机生成token，作为登录令牌
    String token = UUID.randomUUID().toString(true);
    // 7.2.将User对象转为HashMap存储
    UserDTO userDTO = BeanUtil.copyProperties(user, UserDTO.class);
    Map<String, Object> userMap = BeanUtil.beanToMap(userDTO, new HashMap<>(),
            CopyOptions.create()
                    .setIgnoreNullValue(true)
                    .setFieldValueEditor((fieldName, fieldValue) -> fieldValue.toString()));
    // 7.3.存储
    String tokenKey = LOGIN_USER_KEY + token;
    stringRedisTemplate.opsForHash().putAll(tokenKey, userMap);
    // 7.4.设置token有效期
    stringRedisTemplate.expire(tokenKey, LOGIN_USER_TTL, TimeUnit.MINUTES);

    // 8.返回token
    return Result.ok(token);
}
```

**说明：**

1). UserDTO userDTO = BeanUtil.copyProperties(user, UserDTO.class);

- **作用**：把数据库查出来的 `User` 实体（包含密码等敏感字段），复制为 `UserDTO`（只保留 id、nickName、icon 等非敏感字段）。
- **核心意义**：避免敏感信息（比如密码）泄露到前端 / Redis 中，保证数据安全。

2). Map<String, Object> userMap = BeanUtil.beanToMap(userDTO);

- **作用**：把 `UserDTO` 对象转换成 `Map` 集合（键是字段名，值是字段值）。
- **核心意义**：Redis 的 Hash 结构只能接收「键值对」形式的数据，所以必须把对象转成 Map 才能存入。

3). `setFieldValueEditor(...)`：强制把所有字段值转成字符串

- Redis 的 Hash 结构有个「死规矩」：**键和值都必须是字符串类型**，不支持 Long、Integer 等数字类型。
- ✅ 加了这个配置：`fieldValueEditor` 是个「编辑器」，它会遍历所有字段值，把不管是 Long、Integer 还是其他类型的值，都强制转成字符串 —— 比如 Long 的 `10086` 会变成字符串 `"10086"`，存入 Redis 后完全符合 Redis 的字符串要求，后续取值转换也不会报错。

4), stringRedisTemplate.expire(...)

**给 Redis 中指定的 Key 设置「自动删除倒计时」，时间一到，Redis 就自动把这个 Key 和它对应的所有数据删掉**。

#### 5. 登录刷新问题

思路分析

之前的拦截器无法对不需要拦截的路径生效，那么我们可以添加一个拦截器，在第一个拦截器中拦截所有的路径，把第二个拦截器做的事情放入到第一个拦截器中，同时刷新令牌，因为第一个拦截器有了threadLocal的数据，所以此时第二个拦截器只需要判断拦截器中的user对象是否存在即可，完成整体刷新功能。

<img src="https://i-blog.csdnimg.cn/direct/17a11503833e4801a998127d444b002f.png" alt="img" style="zoom: 50%;" />

代码实现

① RefreshTokenInterceptor：做 “数据准备 + Token 续期”（永远放行）

```java
@Override
public boolean preHandle(...) {
    // 1. 从请求头拿Token（比如前端传的authorization: xxx）
    String token = request.getHeader("authorization");
    if (StrUtil.isBlank(token)) {
        return true; // 没Token也放行，交给LoginInterceptor判断
    }
    // 2. 去Redis查用户信息（根据TokenKey查Hash）
    String key = LOGIN_USER_KEY + token;
    Map<Object, Object> userMap = stringRedisTemplate.opsForHash().entries(key);
    // 3. 没查到用户（Token过期/无效），放行（交给LoginInterceptor拦截）
    if (userMap.isEmpty()) {
        return true;
    }
    // 4. 查到用户，转成UserDTO存入ThreadLocal（给LoginInterceptor用）
    UserDTO userDTO = BeanUtil.fillBeanWithMap(userMap, new UserDTO(), false);
    UserHolder.saveUser(userDTO);
    // 5. 关键：刷新Token有效期（用户发请求就续期，避免使用中过期）
    stringRedisTemplate.expire(key, LOGIN_USER_TTL, TimeUnit.MINUTES);
    // 6. 永远放行（它只做准备，不拦人）
    return true;
}

@Override
public void afterCompletion(...) {
    UserHolder.removeUser(); // 请求结束，清空ThreadLocal，防内存泄漏
}
```

② LoginInterceptor：只做 “权限拦截”（只判断，不干活）

```java
@Override
public boolean preHandle(...) {
    // 只看ThreadLocal里有没有用户（RefreshTokenInterceptor存的）
    if (UserHolder.getUser() == null) {
        response.setStatus(401); // 没用户，返回401
        return false; // 拦截
    }
    return true; // 有用户，放行
}
```

### 商户查询缓存

#### 1. 添加商户缓存

思路分析

标准的操作方式就是查询数据库之前先查询缓存，如果缓存数据存在，则直接从缓存中返回，如果缓存数据不存在，再查询数据库，然后将数据存入redis。

<img src="https://i-blog.csdnimg.cn/direct/c984782a64eb4e2e932f68d0acda5d39.png" alt="img" style="zoom:50%;" />

代码实现

```java
@Override
public Result queryById(Long id) {
    String key = "cache:shop:" + id;
    // 1. 从redis查询商铺缓存
    String shopJson = stringRedisTemplate.opsForValue().get(key);
    // 2. 判断是否存在
    if (StrUtil.isNotBlank(shopJson)) {
        // 3. 存在，直接返回
        Shop shop = JSONUtil.toBean(shopJson, Shop.class);
        return Result.ok(shop);
    }
    // 4. 不存在，根据id查询数据库
    Shop shop = getById(id);
    // 5. 不存在，返回错误
    if (shop == null) {
        return Result.fail("店铺不存在！");
    }
    // 6. 存在，写入redis
    stringRedisTemplate.opsForValue().set(key, JSONUtil.toJsonStr(shop));
    // 7. 返回
    return Result.ok(shop);
}
```

**说明：**

① `@Resource` 能成功注入 `StringRedisTemplate`，核心原因是：**Spring 容器中已经存在一个类型为 `StringRedisTemplate` 的 Bean，而 `@Resource` 注解可以根据名称或类型来查找并注入这个 Bean**。Spring Boot 有一套「自动配置」逻辑，当你在项目中引入 `spring-boot-starter-data-redis` 依赖后，Spring 会自动加载 `RedisAutoConfiguration` 类（这个类是 Spring 框架自带的，不是你写的），里面会**自动创建 `StringRedisTemplate` 和 `RedisTemplate` 两个 Bean**。

② Shop shop = JSONUtil.toBean(shopJson, Shop.class); 为什么要转化类型？

- **Redis 的存储限制**：Redis 是一个键值对数据库，它只能存储字符串、数字等基础类型，不能直接存储 Java 对象。所以你在把 `Shop` 存进 Redis 时，必须先用 `JSONUtil.toJsonStr(shop)` 把它转成 JSON 字符串（文本）才能存。
- **Java 的业务需求**：从 Redis 取出来后，必须把 JSON 字符串**还原成 `Shop` 对象**，才能在 Java 代码里正常使用。

#### 2. 缓存更新策略

三种策略

**① 内存淘汰：**redis自动进行，当redis内存达到咱们设定的max-memery的时候，会自动触发淘汰机制，淘汰掉一些不重要的数据(可以自己设置策略方式)

**② 超时剔除：**当我们给redis设置了过期时间ttl之后，redis会将超时的数据进行删除，方便咱们继续使用缓存

**③ 主动更新：**我们可以手动调用方法把缓存删掉，通常用于解决缓存和数据库不一致问题

<img src="https://i-blog.csdnimg.cn/direct/75d7871a0ea74a8aacdca64d2b8b1570.png" alt="img" style="zoom: 50%;" />

先操作缓存还是先操作数据库？

答案：应该先操作数据库。

左边「先删缓存，再更数据库」的并发问题（旧值 10、新值 20）

① 初始状态

- 数据库中值：10（旧值）
- Redis 缓存中值：10（旧值）

② 并发时序

| 时间顺序 | 线程 1（更新操作：把值改成 20） | 线程 2（查询操作）        |
| -------- | ------------------------------- | ------------------------- |
| 1        | 删除 Redis 缓存（缓存变为空）   | -                         |
| 2        | -                               | 发起查询，缓存未命中      |
| 3        | -                               | 去数据库读取，拿到旧值 10 |
| 4        | -                               | 把旧值 10 写入 Redis 缓存 |
| 5        | 执行数据库更新，把值改成 20     | -                         |

③ 最终结果

- 数据库值：20（新值）
- Redis 缓存值：10（旧值）
- 后续所有查询都会直接读缓存的 10，直到缓存过期 / 被删除 —— 这就是**缓存与数据库的数据不一致**，本质是「缓存脏读」。

<img src="https://i-blog.csdnimg.cn/direct/66cecdc0432d4d92ab7df79b989e7fe4.png" alt="img" style="zoom: 50%;" />

实现商铺和缓存与数据库双写一致

```java
@Override
@Transactional
public Result update(Shop shop) {
    Long id = shop.getId();
    if (id == null) {
        return Result.fail("店铺id不能为空");
    }
    // 1. 更新数据库
    updateById(shop);
    // 2. 删除缓存
    stringRedisTemplate.delete(CACHE_SHOP_KEY + id);
    return Result.ok();
}
```

**说明：**

`@Transactional` 事务注解

- **作用**：将整个方法包裹在一个数据库事务中，确保 “更新数据库” 和 “删除缓存” 这两个操作要么全部成功，要么全部失败（回滚）。

缓存穿透问题的解决思路

① 缓存穿透是指客户端请求的数据在缓存中和数据库中都不存在，这样缓存永远不会生效，这些请求都会打到数据库。

② 常见的解决方案有两种：

1). 缓存空对象

当我们客户端访问不存在的数据时，先请求redis，但是此时redis中没有数据，此时会访问到数据库，但是数据库中也没有数据，这个数据穿透了缓存，直击数据库，我们都知道数据库能够承载的并发不如redis这么高，如果大量的请求同时过来访问这种不存在的数据，这些请求就都会访问到数据库，简单的解决方案就是哪怕这个数据在数据库中也不存在，我们也把这个数据存入到redis中去。**这样，下次用户过来访问这个不存在的数据，那么在 redis 中也能找到这个数据，**就不会进入到**数据库**了。

2). 布隆过滤

布隆过滤器其实采用的是哈希思想来解决这个问题，通过一个庞大的二进制数组，走哈希思想去判断当前这个要查询的这个数据是否存在，如果布隆过滤器判断存在，则放行，这个请求会去访问redis，哪怕此时redis中的数据过期了，但是数据库中一定存在这个数据，在数据库中查询出来这个数据后，再将其放入到redis中。

缺点：不存在一定不存在，存在可能不存在

<img src="https://i-blog.csdnimg.cn/direct/6ed22a2df1f6443a9a6565665382401b.png" alt="img" style="zoom:50%;" />

编码解决商品查询的缓存穿透问题

重点代码

```java
if (shopJson != null) {
    return Result.fail("店铺信息不存在");
}
```

**说明：**

① 先明确两个前置条件：

- `StrUtil.isNotBlank(shopJson)`：判断字符串**非空且非空白**（即 `shopJson` 不是 `null`、不是 `""`、不是全空格）；
- 前一行已经判定 `StrUtil.isNotBlank(shopJson) == false`，说明 `shopJson` 只有两种可能：`null` 或 `""`（空字符串）。

② 这行 `if (shopJson != null)`：说明 `shopJson` 是 `""`（空字符串）—— 这个 `""` 是你之前主动存入 Redis 的「空对象标记」（对应代码里 `stringRedisTemplate.opsForValue().set(key, "", ...)`）。

③ 逻辑意义：

- 如果 Redis 里存的是 `""`，说明**之前已经查过这个 ID 的店铺，数据库里根本没有**；
- 此时直接返回 “店铺不存在”，不用再查数据库，避免恶意请求（比如传不存在的 ID）反复穿透到数据库，这就是「缓存空对象防穿透」的核心逻辑。

缓存雪崩问题及解决思路

① 缓存雪崩是指在同一时段大量的缓存key同时失效或者Redis服务宕机，导致大量请求到达数据库，带来巨大压力。

② 解决方案：

- 给不同的Key的TTL添加随机值
- 利用Redis集群提高服务的可用性
- 给缓存业务添加降级限流策略
- 给业务添加多级缓存

<img src="https://i-blog.csdnimg.cn/direct/68f4a24eab1f4f20ba1440e13a68238a.png" alt="img" style="zoom:50%;" />

缓存击穿问题及解决思路

① 缓存击穿问题也叫热点Key问题，就是一个被高并发访问并且缓存重建业务较复杂的key突然失效了，无数的请求访问会在瞬间给数据库带来巨大的冲击。

逻辑分析：假设线程1在查询缓存之后，本来应该去查询数据库，然后把这个数据重新加载到缓存的，此时只要线程1走完这个逻辑，其他线程就都能从缓存中加载这些数据了，但是假设在线程1没有走完的时候，后续的线程2，线程3，线程4同时过来访问当前这个方法， 那么这些线程都不能从缓存中查询到数据，那么他们就会同一时刻来访问查询缓存，都没查到，接着同一时间去访问数据库，同时的去执行数据库代码，对数据库访问压力过大。

<img src="https://i-blog.csdnimg.cn/direct/0415ca1defe54e5cbe4d695f2dd244e9.png" alt="img" style="zoom:50%;" />

② 解决方案：

1). 互斥锁

假设现在线程1过来访问，它查询缓存没有命中，但是此时它获得到了锁的资源，那么线程1就会一个人去执行逻辑，假设现在线程2过来，线程2在执行过程中，并没有获得到锁，那么线程2就可以进行到休眠，直到线程1把锁释放后，线程2获得到锁，然后再来执行逻辑，此时就能够从缓存中拿到数据了。

<img src="https://i-blog.csdnimg.cn/direct/c34c0f2a50c5474a898660823f50ece4.png" alt="img" style="zoom: 67%;" />

2). 逻辑过期

我们把过期时间设置在redis的value中，注意：这个过期时间并不会直接作用于redis，而是我们后续通过逻辑去处理。假设线程1去查询缓存，然后从value中判断出来当前的数据已经过期了，此时线程1去获得互斥锁，那么其他线程会进行阻塞，获得了锁的线程他会开启一个线程去进行以前的重构数据的逻辑，直到新开的线程完成这个逻辑后，才释放锁， 而线程1直接进行返回，假设现在线程3过来访问，由于线程线程2持有着锁，所以线程3无法获得锁，线程3也直接返回数据，只有等到新开的线程2把重建数据构建完后，其他线程才能走返回正确的数据。

这种方案巧妙在于，异步的构建缓存，缺点在于在构建完缓存之前，返回的都是脏数据。

利用互斥锁解决缓存击穿问题

① 思路分析

核心思路就是利用redis的setnx方法来表示获取锁，该方法含义是redis中如果没有这个key，则插入成功，返回1，在stringRedisTemplate中返回true，如果有这个key则插入失败，则返回0，在stringRedisTemplate返回false，我们可以通过true，或者是false，来表示是否有线程成功插入key，成功插入的key的线程我们认为他就是获得到锁的线程。

② 代码实现

```java
private boolean tryLock(String key) {
    Boolean flag = stringRedisTemplate.opsForValue().setIfAbsent(key, "1", 10, TimeUnit.SECONDS);
    return BooleanUtil.isTrue(flag);
}

private void unlock(String key) {
    stringRedisTemplate.delete(key);
}
```

**说明：**

① `setIfAbsent(key, "1", 10, TimeUnit.SECONDS)`：Redis 的`SETNX`命令（不存在则设置），实现分布式锁：

- 如果 key 不存在，设置 key=1，过期时间 10 秒，返回`true`（加锁成功）；
- 如果 key 已存在，返回`false`（加锁失败）；
- 注意：返回值是`Boolean`（包装类），**可能为 null**（比如 Redis 连接超时 / 异常）；

② 为什么不用直接 return flag？

直接 return 可能出现`NullPointerException`（比如 flag=null 时），这个工具类帮你做了空值兜底，保证返回的是 boolean（基本类型），更安全。

利用逻辑过期解决缓存击穿问题

① 思路分析

当用户开始查询redis时，判断是否命中，如果没有命中则直接返回空数据，不查询数据库，而一旦命中后，将value取出，判断value中的过期时间是否满足，如果没有过期，则直接返回redis中的数据，如果过期，则在开启独立线程后直接返回之前的数据，独立线程去重构数据，重构完成后释放互斥锁。

<img src="https://i-blog.csdnimg.cn/direct/4c55ff18fdc148ea826c62ef90c38e75.png" alt="img" style="zoom:50%;" />

② 代码实现

1). 新建一个实体类

```java
@Data
public class RedisData {
    private LocalDateTime expireTime;
    private Object data;
}
```

2). ShopServiceImpl

```java
private static final ExecutorService CACHE_REBUILD_EXECUTOR = Executors.newFixedThreadPool(10);
public Shop queryWithLogicalExpire( Long id ) {
    String key = CACHE_SHOP_KEY + id;
    // 1.从redis查询商铺缓存
    String json = stringRedisTemplate.opsForValue().get(key);
    // 2.判断是否存在
    if (StrUtil.isBlank(json)) {
        // 3.存在，直接返回
        return null;
    }
    // 4.命中，需要先把json反序列化为对象
    RedisData redisData = JSONUtil.toBean(json, RedisData.class);
    Shop shop = JSONUtil.toBean((JSONObject) redisData.getData(), Shop.class);
    LocalDateTime expireTime = redisData.getExpireTime();
    // 5.判断是否过期
    if(expireTime.isAfter(LocalDateTime.now())) {
        // 5.1.未过期，直接返回店铺信息
        return shop;
    }
    // 5.2.已过期，需要缓存重建
    // 6.缓存重建
    // 6.1.获取互斥锁
    String lockKey = LOCK_SHOP_KEY + id;
    boolean isLock = tryLock(lockKey);
    // 6.2.判断是否获取锁成功
    if (isLock){
        CACHE_REBUILD_EXECUTOR.submit( ()->{

            try{
                //重建缓存
                this.saveShop2Redis(id,20L);
            }catch (Exception e){
                throw new RuntimeException(e);
            }finally {
                unlock(lockKey);
            }
        });
    }
    // 6.4.返回过期的商铺信息
    return shop;
}
```

**说明：**

① RedisData redisData = JSONUtil.toBean(shopJson, RedisData.class);

**核心前提**：`RedisData` 是一个**自定义的封装类**（你项目里肯定有这个类），作用是把 “业务数据（Shop）” 和 “逻辑过期时间” 打包存到 Redis 里。

② JSONObject data = (JSONObject) redisData.getData();

`redisData.getData()` 拿到的是 RedisData 里的 `data` 字段（类型是 Object），但这个字段实际存的是 Shop 对象的 JSON 格式数据，所以需要强转成 `JSONObject`（Hutool 工具类的 JSON 对象，也可以理解成 Map）。

封装Redis工具类

通用的缓存穿透解决方案

遵循 “先查缓存 → 缓存无则查数据库 → 数据库无则缓存空值 → 数据库有则缓存数据” 的逻辑，且通过泛型实现了 “通用化”

```java
    public <R, ID> R queryWithPassThrough(String keyPrefix , ID id, Class<R> type, Function<ID, R> dbFallback,
                                          Long time, TimeUnit unit) {  //不太理解
        String key = keyPrefix + id;

        String json = stringRedisTemplate.opsForValue().get(key);

        if (StrUtil.isNotBlank(json)) {
            return JSONUtil.toBean(json, type);
        }

        if (json != null) {  //不太理解
            return null;
        }

        R r = dbFallback.apply(id);
        if (r == null) {
            stringRedisTemplate.opsForValue().set(key, "", CACHE_NULL_TTL, TimeUnit.MINUTES);
            return null;
        }

        this.set(key, r, time, unit);

        return r;
    }
    Shop shop = cacheClient.queryWithPassThrough(CACHE_SHOP_KEY, id, Shop.class, this::getById, CACHE_SHOP_TTL, TimeUnit.MINUTES); //不太理解
```

**说明：**

1). 先拆解方法签名

```java
// 泛型定义：<R, ID> （和上一版一致）
// R = 返回值类型（如Shop、User、Goods），ID = 主键类型（如Long、Integer）
public <R, ID> R queryWithPassThrough(
    String keyPrefix,       // 缓存key前缀（如"cache:shop:"、"cache:goods:"）
    ID id,                  // 要查询的主键（如店铺id=1、商品id=2）
    Class<R> type,          // 返回值的类类型（如Shop.class、Goods.class）
    Function<ID, R> dbFallback,  // 数据库查询回调（传入id，返回业务数据）
    Long time,              // 新增：缓存有效数据的过期时间（数值）
    TimeUnit unit           // 新增：过期时间的单位（如分钟、小时，和time配合）
)
```

- `R`：代表**返回值类型**（可以是 Shop、User、Goods 等任意业务类）；
- `ID`：代表**主键类型**（可以是 Long、Integer、String 等）；

2). this::getById

**语法含义**：等价于一个 Lambda 表达式 `(Long id) -> this.getById(id)`，本质是 “把查询数据库的方法作为参数传给通用方法”；

通用化、适配所有业务的缓存击穿解决方案（逻辑过期策略）

```java
// 1. 拼接通用缓存key（比如keyPrefix=cache:shop:，id=1 → key=cache:shop:1）
String key = keyPrefix + id;

// 2. 查Redis缓存：逻辑过期的前提是缓存里有数据（只是过期），如果缓存为空，直接返回null
String json = stringRedisTemplate.opsForValue().get(key);
if (StrUtil.isBlank(json)) { // 缓存为空（没存过/被删了），不是热点key，直接返回
    return null;
}

// 3. 反序列化：把Redis里的JSON转成封装了“数据+过期时间”的RedisData对象（核心！）
// Redis里存的不是单纯的Shop/User，而是RedisData的JSON（包含业务数据+逻辑过期时间）
RedisData redisData = JSONUtil.toBean(json, RedisData.class);
// 从RedisData中拆解出业务数据（比如Shop的JSON），转成JSONObject
JSONObject data = (JSONObject) redisData.getData();
// 把JSONObject转成泛型R（比如Shop、User）
R r = JSONUtil.toBean(data, type);
// 从RedisData中拆解出逻辑过期时间（不是Redis的TTL）
LocalDateTime expireTime = redisData.getExpireTime();

// 4. 判断是否逻辑过期：没过期→直接返回缓存数据，不走数据库
if (expireTime.isAfter(LocalDateTime.now())) {
    return r;
}

// 5. 已过期→尝试获取分布式锁（保证只有1个线程更新缓存）
String lockKey = LOCK_SHOP_KEY + id; // 锁key（比如lock:shop:1）
boolean isLock = tryLock(lockKey);   // 加锁（setIfAbsent）
if (isLock) { // 只有1个线程能拿到锁
    // 6. 异步重建缓存：用线程池执行，不阻塞当前请求
    CACHE_REBUILD_EXECUTOR.submit(() -> {
        try {
            // 6.1 查数据库（调用传入的dbFallback，比如this::getById）
            R r1 = dbFallback.apply(id);
            // 6.2 把新数据封装成RedisData，存入Redis（设置新的逻辑过期时间）
            this.setWithLogicalExpire(key, r1, time, unit);
        } catch (Exception e) {
            log.error("重建缓存失败", e); // 异常只打日志，不影响主线程
        } finally {
            unlock(lockKey); // 最终释放锁，避免死锁
        }
    });
}

// 7. 不管有没有拿到锁，都返回旧数据（核心！解决缓存击穿的关键）
return r;
```

**说明：**

**1). `dbFallback.apply(id)` 是什么？**

`dbFallback`是你调用方法时传入的 “数据库查询逻辑”，比如：

```java
// 调用时传入this::getById（根据id查店铺）
cacheClient.queryWithLogicalExpire(CACHE_SHOP_KEY, id, Shop.class, this::getById, 20L, TimeUnit.MINUTES);
```

`dbFallback.apply(id)` 就是执行`this.getById(id)`，查数据库获取最新的店铺数据 —— 泛型 + 函数式接口让这个方法适配所有业务的数据库查询。

### 优惠券秒杀

#### 1. 全局唯一ID

为了增加ID的安全性，我们不直接使用Redis自增的数值，而是拼接一些其它信息：

![img](https://i-blog.csdnimg.cn/direct/15fcbfff7fdf483391d5c58a62274222.png)

ID的组成部分：符号位：1bit，永远为0

时间戳：31bit，以秒为单位，可以使用69年

序列号：32bit，秒内的计数器，支持每秒产生2^32个不同ID

#### 2. Redis实现全局唯一Id

RedisIdWorker

```java
@Component
public class RedisIdWorker {
    /**
     * 开始时间戳
     */
    private static final long BEGIN_TIMESTAMP = 1640995200L;
    /**
     * 序列号的位数
     */
    private static final int COUNT_BITS = 32;

    private StringRedisTemplate stringRedisTemplate;

    public RedisIdWorker(StringRedisTemplate stringRedisTemplate) {
        this.stringRedisTemplate = stringRedisTemplate;
    }

    public long nextId(String keyPrefix) {
        // 1.生成时间戳
        LocalDateTime now = LocalDateTime.now();
        long nowSecond = now.toEpochSecond(ZoneOffset.UTC);
        long timestamp = nowSecond - BEGIN_TIMESTAMP;

        // 2.生成序列号
        // 2.1.获取当前日期，精确到天
        String date = now.format(DateTimeFormatter.ofPattern("yyyy:MM:dd"));
        // 2.2.自增长
        long count = stringRedisTemplate.opsForValue().increment("icr:" + keyPrefix + ":" + date);

        // 3.拼接并返回
        return timestamp << COUNT_BITS | count;
    }
}
```

**说明：**

① String date = now.format(DateTimeFormatter.ofPattern("yyyy:MM:dd"));

- 按**日期拆分 Redis 计数器的 Key**，避免单个 Key 的计数器值无限增大（比如累计到几十亿，既占内存又不方便管理）；
- 让每个日期的计数器从`1`开始，减少 ID 的长度（如果全局一个计数器，数值会快速变大）；
- 方便按日期统计 / 清理数据（比如删除 30 天前的计数器 Key）。

举个例子：订单业务的 Key，2026-03-11 是`icr:order:2026:03:11`，2026-03-12 就变成`icr:order:2026:03:12`，每天的计数器独立。

② return timestamp << COUNT_BITS | count.longValue();

这是**核心的位运算逻辑**，目的是把「相对时间戳」和「每日计数器」拼接成一个完整的 ID。

- `timestamp << COUNT_BITS`：把`timestamp`（相对时间戳）**左移 32 位**，放到 64 位`long`的高位区域；比如`timestamp=100`，左移 32 位后变成`100 * 2^32`（二进制就是 100 后面跟 32 个 0）；
- `count.longValue()`：把 Redis 返回的计数器值转为`long`（因为返回的是`Long`包装类）；
- `|`（按位或）：把高位的时间戳和低位的计数器拼接成一个数（因为两部分的二进制位不重叠，按位或等价于拼接）。

测试类

```java
@Test
void testIdWorker() throws InterruptedException {
    CountDownLatch latch = new CountDownLatch(300);

    Runnable task = () -> {
        for (int i = 0; i < 100; i++) {
            long id = redisIdWorker.nextId("order");
            System.out.println("id = " + id);
        }
        latch.countDown();
    };
    long begin = System.currentTimeMillis();
    for (int i = 0; i < 300; i++) {
        es.submit(task);
    }
    latch.await();
    long end = System.currentTimeMillis();
    System.out.println("time = " + (end - begin));
}
```

**说明：**

CountDownLatch 的工作原理：

- 你（主线程）要统计 300 个工人（子线程）完成 “每人生产 100 个零件（生成 100 个 ID）” 的总耗时；
- 你先给工人发了一个 “倒计时牌”（CountDownLatch (300)），初始数字是 300；
- 每个工人完成自己的 100 个零件后，就把倒计时牌数字减 1（`latch.countDown()`）；
- 你站在旁边等（`latch.await()`），直到倒计时牌数字变成 0（所有工人都完成），才开始计算从开工到收工的总时间；
- 如果没有这个倒计时牌，你可能刚安排完工人就看表，此时工人还在干活，统计的时间毫无意义。

#### 3. 实现秒杀下单

思路分析

- 秒杀是否开始或结束，如果尚未开始或已经结束则无法下单
- 库存是否充足，不足则无法下单

① 当用户开始进行下单，我们应当去查询优惠卷信息，查询到优惠卷信息，判断是否满足秒杀条件。

② 比如时间是否充足，如果时间充足，则进一步判断库存是否足够，如果两者都满足，则扣减库存，创建订单，然后返回订单id，如果有一个条件不满足则直接结束。

<img src="https://i-blog.csdnimg.cn/direct/34b96b6c992e42a9b3321b5df2f08f96.png" alt="img" style="zoom:67%;" />

代码实现

**VoucherOrderServiceImpl**

```java
@Override
public Result seckillVoucher(Long voucherId) {
    // 1.查询优惠券
    SeckillVoucher voucher = seckillVoucherService.getById(voucherId);
    // 2.判断秒杀是否开始
    if (voucher.getBeginTime().isAfter(LocalDateTime.now())) {
        // 尚未开始
        return Result.fail("秒杀尚未开始！");
    }
    // 3.判断秒杀是否已经结束
    if (voucher.getEndTime().isBefore(LocalDateTime.now())) {
        // 尚未开始
        return Result.fail("秒杀已经结束！");
    }
    // 4.判断库存是否充足
    if (voucher.getStock() < 1) {
        // 库存不足
        return Result.fail("库存不足！");
    }
    //5，扣减库存
    boolean success = seckillVoucherService.update()
            .setSql("stock= stock -1")
            .eq("voucher_id", voucherId).update();
    if (!success) {
        //扣减库存
        return Result.fail("库存不足！");
    }
    //6.创建订单
    VoucherOrder voucherOrder = new VoucherOrder();
    // 6.1.订单id
    long orderId = redisIdWorker.nextId("order");
    voucherOrder.setId(orderId);
    // 6.2.用户id
    Long userId = UserHolder.getUser().getId();
    voucherOrder.setUserId(userId);
    // 6.3.代金券id
    voucherOrder.setVoucherId(voucherId);
    save(voucherOrder);

    return Result.ok(orderId);

}
```

**说明：**

① Resource private ISeckillVoucherService seckillVoucherService;

**核心解释**：这是 Spring 的**依赖注入**，目的是引入操作「秒杀优惠券表（SeckillVoucher）」的服务类。

- `ISeckillVoucherService`：MyBatis-Plus 自动生成的服务接口，专门用于操作`SeckillVoucher`（秒杀优惠券）表，包含查询、修改、删除等方法；
- **为什么需要它**：秒杀逻辑的第一步是查询优惠券的秒杀时间、库存等信息（这些存在`SeckillVoucher`表），所以必须注入这个服务来操作该表。

② 扣减库存的 update 链式调用

```java
seckillVoucherService.update()
        .setSql("stock = stock - 1")
        .eq("voucher_id", voucherId)
        .update();
```

这是**MyBatis-Plus 的链式更新语法**，目的是扣减秒杀优惠券的库存，拆解每一步：

| 代码片段                         | 作用                                                         |
| -------------------------------- | ------------------------------------------------------------ |
| `seckillVoucherService.update()` | 初始化 MyBatis-Plus 的更新构造器（UpdateWrapper）            |
| `.setSql("stock = stock - 1")`   | 设置要执行的 SQL 片段：将库存字段减 1（直接写 SQL 片段，而非 set ("stock", 具体值)，避免多线程下覆盖） |
| `.eq("voucher_id", voucherId)`   | 添加更新条件：只更新`voucher_id`等于传入的优惠券 ID 的记录   |
| `.update()`                      | 执行最终的更新操作，对应 SQL：`UPDATE seckill_voucher SET stock = stock - 1 WHERE voucher_id = ?` |

#### 4. 库存超卖问题分析

存在的问题

假设线程1过来查询库存，判断出来库存大于1，正准备去扣减库存，但是还没有来得及去扣减，此时线程2过来，线程2也去查询库存，发现这个数量一定也大于1，那么这两个线程都会去扣减库存，最终多个线程相当于一起去扣减库存，此时就会出现库存的超卖问题。

<img src="https://i-blog.csdnimg.cn/direct/805226df173f4d9689e90499f4b21479.png" alt="img" style="zoom: 50%;" />

解决方案（我们采用乐观锁）

<img src="https://i-blog.csdnimg.cn/direct/3fe97320577d4fc099380950e290e6c3.png" alt="img" style="zoom: 67%;" />

① 乐观锁：会有一个版本号，每次操作数据会对版本号+1，再提交回数据时，会去校验是否比之前的版本大1 ，如果大1 ，则进行操作成功。这套机制的核心逻辑在于：如果在操作过程中，版本号只比原来大1 ，那么就意味着操作过程中没有人对它进行过修改，它的操作就是安全的，如果不大1，则数据被修改过，乐观锁还有一些变种的处理方式比如cas

② 代码实现

```java
        boolean success = seckillVoucherService.update()
                .setSql("stock = stock - 1")
                .eq("voucher_id", voucherId)
                .gt("stock",voucher.getStock())
                .update(); 
```

**说明：**

`.gt("stock", voucher.getStock())` ✅ 核心防超卖逻辑

- `gt` 是 `greater than` 的缩写，意为**大于**。
- 这是**乐观锁 / 库存校验的关键**：要求**数据库中当前的库存值**，必须**大于**代码中拿到的**预期库存**（`voucher.getStock()`）。
- 为什么能防超卖？多线程并发请求时，只有当数据库库存确实大于预期值时，才会执行扣减；如果某线程执行时库存已不足，该条件会直接失败，避免 `stock` 变成负数。

#### 5. 一人一单

版本1.0

```java
@Transactional
public synchronized Result createVoucherOrder(Long voucherId) {

	Long userId = UserHolder.getUser().getId();
         // 5.1.查询订单
        int count = query().eq("user_id", userId).eq("voucher_id", voucherId).count();
        // 5.2.判断是否存在
        if (count > 0) {
            // 用户已经购买过了
            return Result.fail("用户已经购买过一次！");
        }

        // 6.扣减库存
        boolean success = seckillVoucherService.update()
                .setSql("stock = stock - 1") // set stock = stock - 1
                .eq("voucher_id", voucherId).gt("stock", 0) // where id = ? and stock > 0
                .update();
        if (!success) {
            // 扣减失败
            return Result.fail("库存不足！");
        }

        // 7.创建订单
        VoucherOrder voucherOrder = new VoucherOrder();
        // 7.1.订单id
        long orderId = redisIdWorker.nextId("order");
        voucherOrder.setId(orderId);
        // 7.2.用户id
        voucherOrder.setUserId(userId);
        // 7.3.代金券id
        voucherOrder.setVoucherId(voucherId);
        save(voucherOrder);

        // 7.返回订单id
        return Result.ok(orderId);
}
```

**说明：**

`synchronized` 修饰整个方法 → 全局串行，性能崩溃

```java
public synchronized Result createVoucherOrder(Long voucherId) {
```

❌ **所有用户的秒杀请求都要排队执行**（比如 1000 个用户下单，只能一个接一个处理）；

❌ 本来锁的目标是 “一人一单”（只锁单个用户），结果锁了所有用户，完全违背并发设计初衷。

版本2.0

```java
@Transactional
public  Result createVoucherOrder(Long voucherId) {
	Long userId = UserHolder.getUser().getId();
	synchronized(userId.toString().intern()){
         // 5.1.查询订单
        int count = query().eq("user_id", userId).eq("voucher_id", voucherId).count();
        // 5.2.判断是否存在
        if (count > 0) {
            // 用户已经购买过了
            return Result.fail("用户已经购买过一次！");
        }

        // 6.扣减库存
        boolean success = seckillVoucherService.update()
                .setSql("stock = stock - 1") // set stock = stock - 1
                .eq("voucher_id", voucherId).gt("stock", 0) // where id = ? and stock > 0
                .update();
        if (!success) {
            // 扣减失败
            return Result.fail("库存不足！");
        }

        // 7.创建订单
        VoucherOrder voucherOrder = new VoucherOrder();
        // 7.1.订单id
        long orderId = redisIdWorker.nextId("order");
        voucherOrder.setId(orderId);
        // 7.2.用户id
        voucherOrder.setUserId(userId);
        // 7.3.代金券id
        voucherOrder.setVoucherId(voucherId);
        save(voucherOrder);

        // 7.返回订单id
        return Result.ok(orderId);
    }
}
```

**说明：**

锁在事务内 → 一人一单规则仍失效，**锁的释放时机早于事务提交时机**，导致 “一人一单” 规则被突破。

① `@Transactional` 注解的方法，其事务提交时机是「整个方法执行完毕、返回结果后」，而 `synchronized` 锁的释放时机是「代码块执行完毕」。

② 真实执行时序（以同一个用户的两个并发请求为例）：

```bash
线程A（用户1）执行步骤：
1. 获取用户1的锁 → 2. 查订单（count=0）→ 3. 扣库存 → 4. 创订单 → 5. 释放锁（synchronized代码块执行完）→ 6. Spring提交事务（订单真正入库）

线程B（用户1，线程A释放锁后立即执行）：
1. 获取用户1的锁 → 2. 查订单（此时线程A的事务还没提交，数据库中无订单，count=0）→ 3. 重复下单 → 4. 释放锁 → 5. Spring提交事务
```

最终结果：用户 1 会创建两个订单，“一人一单” 的核心规则完全失效。

版本3.0

```java
synchronized (userId.toString().intern()) {
    // 1. 获取 Spring 的代理对象
    IVoucherOrderService proxy = (IVoucherOrderService) AopContext.currentProxy();
    // 2. 通过代理对象调用
    return proxy.createVoucherOrder(voucherId);
}
```

**说明：**

- **保证事务生效**：通过 `proxy` 调用，Spring 代理对象会拦截方法，开启事务、提交 / 回滚，**数据一致性**得到保证。
- **保证一人一单**：锁还在外层，释放锁前事务一定提交，**并发安全性**得到保证。

#### 6. 集群环境下的并发问题

同一个用户（比如用户 100），同时发送请求到 **服务器 A** 和 **服务器 B**。

- **服务器 A** 拿到锁，正在查库存 → 库存充足 → 准备扣减。
- **服务器 B** 拿到锁，正在查库存 → 库存充足 → 准备扣减。
- **原因**：服务器 A 的锁只认识服务器 A 里的线程，它根本不知道服务器 B 里还有个线程在抢同一个资源。
- **结果**：**两个服务器同时执行了扣减逻辑**，导致了 **超卖**，且同一个用户买了 **两份订单**（一人多单）。

### 分布式锁

#### 1. Redis 实现分布式锁版统一

**SimpleRedisLock**

```java
private static final String KEY_PREFIX="lock:"
@Override
public boolean tryLock(long timeoutSec) {
    // 获取线程标示
    long threadId = Thread.currentThread().getId()
    // 获取锁
    Boolean success = stringRedisTemplate.opsForValue()
            .setIfAbsent(KEY_PREFIX + name, threadId + "", timeoutSec, TimeUnit.SECONDS);
    return Boolean.TRUE.equals(success);
}
```

**说明：**

① .setIfAbsent(KEY_PREFIX + name, threadId + "", timeoutSec, TimeUnit.SECONDS);

1). `setIfAbsent` 对应 Redis 的 `SETNX` 命令，核心逻辑是：**如果 key 不存在，则设置值并返回 true；如果 key 已存在，则直接返回 false**—— 这是实现分布式锁 “互斥性” 的核心（保证同一时间只有一个线程能拿到锁）。

2). `threadId + ""` 的小细节，`Thread.currentThread().getId()` 返回的是 **`long` 原始类型**，而 Redis 操作的 value 必须是 `String` 类型。拼接空字符串是最简洁的语法糖，能将 `long` 强制转为 `String`，满足 `setIfAbsent` 的参数类型要求。*等价效果：`String.valueOf(threadId)`，但写法更简洁。*

② 为什么自动拆箱有风险？`Boolean.TRUE.equals(success)` 好在哪？

1). 代码中 `Boolean success = ...` 定义的是**包装类 Boolean 对象**，如果直接写 `return success;`，会触发 **自动拆箱**（将 `Boolean` 转为 `boolean` 原始类型）。

- 当 Redis 操作异常 / 返回 `null` 时，`success` 会是 **`null`**；
- 此时拆箱过程会尝试把 `null` 转为 `boolean`，直接抛出 **`NullPointerException`**，导致程序崩溃。

2). `Boolean.TRUE.equals(success)` 的核心优势

- `Boolean.TRUE` 是 Boolean 类的单例常量，调用其 `equals()` 方法时，内部自带 **null 校验逻辑**；
- 无论 `success` 是 `null`、`Boolean.FALSE` 还是 `Boolean.TRUE`，都能安全返回结果：

| `success` 取值  | `return success;`（直接拆箱） | `return Boolean.TRUE.equals(success);` |
| --------------- | ----------------------------- | -------------------------------------- |
| `null`          | 抛 `NullPointerException`     | 返回 `false`                           |
| `Boolean.FALSE` | 抛 `NullPointerException`     | 返回 `false`                           |
| `Boolean.TRUE`  | 正常返回 `true`               | 返回 `true`                            |

修改业务代码

```java
  @Override
    public Result seckillVoucher(Long voucherId) {
        // 1.查询优惠券
        SeckillVoucher voucher = seckillVoucherService.getById(voucherId);
        // 2.判断秒杀是否开始
        if (voucher.getBeginTime().isAfter(LocalDateTime.now())) {
            // 尚未开始
            return Result.fail("秒杀尚未开始！");
        }
        // 3.判断秒杀是否已经结束
        if (voucher.getEndTime().isBefore(LocalDateTime.now())) {
            // 尚未开始
            return Result.fail("秒杀已经结束！");
        }
        // 4.判断库存是否充足
        if (voucher.getStock() < 1) {
            // 库存不足
            return Result.fail("库存不足！");
        }
        Long userId = UserHolder.getUser().getId();
        //创建锁对象(新增代码)
        SimpleRedisLock lock = new SimpleRedisLock("order:" + userId, stringRedisTemplate);
        //获取锁对象
        boolean isLock = lock.tryLock(1200);
		//加锁失败
        if (!isLock) {
            return Result.fail("不允许重复下单");
        }
        try {
            //获取代理对象(事务)
            IVoucherOrderService proxy = (IVoucherOrderService) AopContext.currentProxy();
            return proxy.createVoucherOrder(voucherId);
        } finally {
            //释放锁
            lock.unlock();
        }
    }
```

#### 2. Redis分布式锁误删情况说明

存在的问题

- **线程 1**成功获取锁，开始执行业务
- 线程 1 遇到**阻塞**（比如 JVM GC 垃圾回收、CPU 繁忙），导致业务执行超时 → Redis 锁**自动过期释放**。
- **线程 2**刚好来抢锁，**成功获取锁**，开始执行自己的业务。
- 线程 1**恢复执行**，业务做完了，它不知道锁已经过期被线程 2 拿走了，直接执行「删除锁」逻辑 → 误删线程 2 的锁。

<img src="https://i-blog.csdnimg.cn/direct/5a3bfdfb12d4427cbe4967a0fcef2b05.png" alt="img" style="zoom:50%;" />

解决方案

① 核心逻辑：在存入锁时，放入自己线程的标识。在删除锁时，判断当前这把锁的标识是不是自己存入的，如果是，则进行删除，如果不是，则不进行删除。

② 代码实现

加锁

```java
private static final String ID_PREFIX = UUID.randomUUID().toString(true) + "-";
@Override
public boolean tryLock(long timeoutSec) {
   // 获取线程标示
   String threadId = ID_PREFIX + Thread.currentThread().getId();
   // 获取锁
   Boolean success = stringRedisTemplate.opsForValue()
                .setIfAbsent(KEY_PREFIX + name, threadId, timeoutSec, TimeUnit.SECONDS);
   return Boolean.TRUE.equals(success);
}
```

释放锁

```java
public void unlock() {
    // 获取线程标示
    String threadId = ID_PREFIX + Thread.currentThread().getId();
    // 获取锁中的标示
    String id = stringRedisTemplate.opsForValue().get(KEY_PREFIX + name);
    // 判断标示是否一致
    if(threadId.equals(id)) {
        // 释放锁
        stringRedisTemplate.delete(KEY_PREFIX + name);
    }
}
```

#### 3. 分布式锁的原子性问题

我们结合线程 1、线程 2 的动作，一步步拆解：

| 时间节点 | 线程 1 动作                                                  | 线程 2 动作                                            | Redis 锁状态       | 关键变化                                                |
| -------- | ------------------------------------------------------------ | ------------------------------------------------------ | ------------------ | ------------------------------------------------------- |
| 1        | 持有锁（value = 线程 1ID），执行业务                         | 阻塞等待锁                                             | 存在（属于线程 1） | 线程 1 正常拿锁                                         |
| 2        | 执行到解锁步骤，先`get`锁，发现 value 是自己的 ID，进入`if`判断 | 等待                                                   | 存在（属于线程 1） | 线程 1 完成 “验证”，还没执行 delete                     |
| 3        | **线程 1 突然卡顿 / GC**（CPU 切换）                         | 无                                                     | **锁过期自动释放** | 致命点！锁因为超时被 Redis 回收，线程 1 还没删          |
| 4        | 卡顿中                                                       | 尝试抢锁，成功获取锁（value = 线程 2ID），开始执行业务 | 存在（属于线程 2） | 线程 2 拿到了锁，业务正在跑                             |
| 5        | 线程 1 恢复执行                                              | 执行业务中                                             | 存在（属于线程 2） | 线程 1 从`if`里继续往下走，直接执行`delete`             |
| 6        | 完成删除                                                     | 业务中                                                 | 被删空             | 线程 1 把线程 2 的锁删了！线程 2 的业务还没做完，锁没了 |

**核心后果**：线程 1 明明做了 “验证归属” 的判断，却依然误删了线程 2 的锁 —— 因为**验证和删除中间被打断了。**

#### 4. 利用Java代码调用Lua脚本改造分布式锁

```java
private static final DefaultRedisScript<Long> UNLOCK_SCRIPT;
    static {
        UNLOCK_SCRIPT = new DefaultRedisScript<>();
        UNLOCK_SCRIPT.setLocation(new ClassPathResource("unlock.lua"));
        UNLOCK_SCRIPT.setResultType(Long.class);
    }

public void unlock() {
    // 调用lua脚本
    stringRedisTemplate.execute(
            UNLOCK_SCRIPT,
            Collections.singletonList(KEY_PREFIX + name),
            ID_PREFIX + Thread.currentThread().getId());
}
经过以上代码改造后，我们就能够实现 拿锁比锁删锁的原子性动作了~
```

**说明：**

**① 静态代码块：加载 Lua 脚本**

- `static final`：脚本只需要加载一次，类加载时初始化，高效复用
- `DefaultRedisScript`：Spring Data Redis 提供的封装类，用来和 Redis 模板配合执行 Lua 脚本
- 脚本位置：`unlock.lua` 放在项目 `resources` 文件夹下，里面就是 “判断 + 删除” 的逻辑

**② unlock () 方法：执行 Lua 脚本释放锁**

- 参数 1：`UNLOCK_SCRIPT` → 刚才加载好的脚本对象
- 参数 2：`Collections.singletonList(KEY_PREFIX + name)` → 脚本里的 `KEYS[1]`，就是锁的 key（比如 `lock:order`）
- 参数 3：`ID_PREFIX + Thread.currentThread().getId()` → 脚本里的 `ARGV[1]`，就是当前线程的唯一标识（用来和锁里存的 value 对比）

### 分布式锁-redission

#### 1. 存在的问题

不可重入：

```java
// 方法A加了分布式锁
public void methodA() {
    lock(); // 线程拿到锁
    methodB(); // 方法B也加了同一个分布式锁
    unlock();
}

// 方法B也加了同一个分布式锁
public void methodB() {
    lock(); // 同一个线程再次申请锁，被拒绝 → 死锁
    // ...业务
    unlock();
}
```

线程执行`methodA`拿到锁后，调用`methodB`时，再次尝试拿同一个锁，这时候分布式锁会认为 “锁已经被别人占了”，导致线程自己阻塞自己，形成**死锁**。

不可重试：

现在的`setnx`实现，线程尝试拿锁一次，如果失败（返回`false`），就直接结束了，没有 “再试一次” 的机制。但实际业务里（比如秒杀、订单创建），锁竞争往往是短暂的，线程应该可以重试几次，提高拿到锁的成功率。

超时释放：

我们给锁加了过期时间（比如 30 秒），本来是为了防止 “服务挂了锁不释放” 导致死锁，但带来了新问题：如果业务执行时间**超过了锁的过期时间**，锁会自动释放，这时候其他线程就能拿到锁，操作同一个资源，导致**数据不一致**。

主从一致性：

**① Redis 主从集群的原理**

- 主节点（Master）：负责写操作（加锁、解锁）
- 从节点（Slave）：负责读操作，主节点的数据会**异步同步**到从节点
- 如果主节点挂了，集群会把一个从节点升级为新的主节点

**② 问题场景**

- 线程 A 向主节点加锁成功，主节点还没把这个锁数据同步到从节点
- 主节点突然宕机了
- 集群选举一个从节点成为新主节点，但这个新主节点**没有刚才的锁数据**，认为锁不存在
- 线程 B 来拿锁，直接成功，这时候就出现了**两个线程同时持有同一个锁**的情况，锁失效，并发安全问题爆发。

#### 2. Redission快速入门

配置Redisson客户端

```java
@Configuration
public class RedissonConfig {

    @Bean
    public RedissonClient redissonClient(){
        // 配置
        Config config = new Config();
        config.useSingleServer().setAddress("redis://192.168.150.101:6379")
            .setPassword("123321");
        // 创建RedissonClient对象
        return Redisson.create(config);
    }
}
```

如何使用Redission的分布式锁

```java
@Resource
private RedissionClient redissonClient;

@Test
void testRedisson() throws Exception{
    //获取锁(可重入)，指定锁的名称
    RLock lock = redissonClient.getLock("anyLock");
    //尝试获取锁，参数分别是：获取锁的最大等待时间(期间会重试)，锁自动释放时间，时间单位
    boolean isLock = lock.tryLock(1,10,TimeUnit.SECONDS);
    //判断获取锁成功
    if(isLock){
        try{
            System.out.println("执行业务");          
        }finally{
            //释放锁
            lock.unlock();
        }
        
    }
}
```

VoucherOrderServiceImpl

```java
@Resource
private RedissonClient redissonClient;

@Override
public Result seckillVoucher(Long voucherId) {
        // 1.查询优惠券
        SeckillVoucher voucher = seckillVoucherService.getById(voucherId);
        // 2.判断秒杀是否开始
        if (voucher.getBeginTime().isAfter(LocalDateTime.now())) {
            // 尚未开始
            return Result.fail("秒杀尚未开始！");
        }
        // 3.判断秒杀是否已经结束
        if (voucher.getEndTime().isBefore(LocalDateTime.now())) {
            // 尚未开始
            return Result.fail("秒杀已经结束！");
        }
        // 4.判断库存是否充足
        if (voucher.getStock() < 1) {
            // 库存不足
            return Result.fail("库存不足！");
        }
        Long userId = UserHolder.getUser().getId();
        //创建锁对象 这个代码不用了，因为我们现在要使用分布式锁
        //SimpleRedisLock lock = new SimpleRedisLock("order:" + userId, stringRedisTemplate);
        RLock lock = redissonClient.getLock("lock:order:" + userId);
        //获取锁对象
        boolean isLock = lock.tryLock();
       
		//加锁失败
        if (!isLock) {
            return Result.fail("不允许重复下单");
        }
        try {
            //获取代理对象(事务)
            IVoucherOrderService proxy = (IVoucherOrderService) AopContext.currentProxy();
            return proxy.createVoucherOrder(voucherId);
        } finally {
            //释放锁
            lock.unlock();
        }
 }
```

#### 3. redission可重入锁原理

3 个核心参数

| 参数      | 含义                         | 作用                                                        |
| --------- | ---------------------------- | ----------------------------------------------------------- |
| `KEYS[1]` | 锁的**大 key**（锁名称）     | 代表这把锁的整体，用来判断锁是否存在                        |
| `ARGV[1]` | 锁的**过期时间**（毫秒）     | 防止锁死锁，即使客户端宕机也会自动释放                      |
| `ARGV[2]` | 锁的**小 key**（持有者标识） | 格式：`客户端ID + ":" + 线程ID`，用来判断锁是否属于当前线程 |

脚本的核心逻辑

```Lua
-- 步骤1：锁不存在 → 直接加锁
if (redis.call('exists', KEYS[1]) == 0) then
    redis.call('hset', KEYS[1], ARGV[2], 1);  -- 新建hash锁，小key对应值=1（第一次持有）
    redis.call('pexpire', KEYS[1], ARGV[1]); -- 给锁设置过期时间
    return nil; -- 返回nil = 加锁成功
end;

-- 步骤2：锁存在，但属于当前线程 → 可重入
if (redis.call('hexists', KEYS[1], ARGV[2]) == 1) then
    redis.call('hincrby', KEYS[1], ARGV[2], 1); -- 重入次数+1
    redis.call('pexpire', KEYS[1], ARGV[1]);    -- 刷新过期时间
    return nil; -- 返回nil = 重入成功
end;

-- 步骤3：锁存在且不属于当前线程 → 抢锁失败
return redis.call('pttl', KEYS[1]); -- 返回锁的剩余过期时间
```

#### 4. redission锁重试和WatchDog机制

Lua 抢锁逻辑

| 条件                   | 操作                              | 返回值                  | 含义       |
| ---------------------- | --------------------------------- | ----------------------- | ---------- |
| 锁不存在               | 插入锁（Hash 结构），设置过期时间 | `null`                  | 抢锁成功   |
| 锁存在且属于当前线程   | 重入次数 + 1，刷新过期时间        | `null`                  | 可重入成功 |
| 锁存在且不属于当前线程 | 无操作                            | 锁的剩余过期时间（ttl） | 抢锁失败   |

`lock()` 核心抢锁流程

```java
long threadId = Thread.currentThread().getId();
Long ttl = tryAcquire(-1, leaseTime, unit, threadId);
// lock acquired
if (ttl == null) {
    return;
}
```

**说明：**

① Long ttl = tryAcquire(-1, leaseTime, unit, threadId);

- `-1`：是 `waitTime` 的默认值（表示无限等待，直到抢到锁）；
- `leaseTime`：锁的过期时间（无参 `lock()` 时默认 `-1`，带参 `lock(10, TimeUnit.SECONDS)` 时为 10）；
- `unit`：时间单位（如 `TimeUnit.MILLISECONDS`）；
- `threadId`：当前线程 ID。

② 返回值 `ttl`：

- `null` → 抢锁 / 可重入成功；
- 非 null 数字 → 锁被其他线程持有，返回锁的剩余过期时间（比如返回 20000 代表锁还有 20 秒过期）。

WatchDog（看门狗）续约机制

```java
RFuture<Long> ttlRemainingFuture = tryLockInnerAsync(waitTime,
                                        commandExecutor.getConnectionManager().getCfg().getLockWatchdogTimeout(),
                                        TimeUnit.MILLISECONDS, threadId, RedisCommands.EVAL_LONG);
ttlRemainingFuture.onComplete((ttlRemaining, e) -> {
    if (e != null) {
        return;
    }

    // lock acquired
    if (ttlRemaining == null) {
        scheduleExpirationRenewal(threadId);
    }
});
return ttlRemainingFuture;
```

**说明：**

① `tryLockInnerAsync(...)` 的第二个参数：`commandExecutor.getConnectionManager().getCfg().getLockWatchdogTimeout()`

- 含义：获取 Redisson 配置的「看门狗默认超时时间」，默认值是 **30 秒**（30000 毫秒）；
- 作用：把锁的初始过期时间设为 30 秒（替代用户传入的 `leaseTime`）。

② if (ttlRemaining == null) { scheduleExpirationRenewal(threadId); }

- 逻辑：只有抢锁成功（`ttlRemaining=null`），才调用 `scheduleExpirationRenewal(threadId)`；
- `scheduleExpirationRenewal`：核心作用是「启动看门狗续约线程」，是连接抢锁和续约的关键方法。

#### 5. redission锁的MutiLock原理

存在的问题

我们去写命令，写在主机上， 主机会将数据同步给从机，但是假设在主机还没有来得及把数据写入到从机去的时候，此时主机宕机，哨兵会发现主机宕机，并且选举一个slave变成master，而此时新的master中实际上并没有锁信息，此时锁信息就已经丢掉了。

<img src="https://i-blog.csdnimg.cn/direct/35cd85875c7c48c7ba2e81e8d3f8fc89.png" alt="img" style="zoom: 50%;" />

解决方案

为了解决这个问题，redission提出来了MutiLock锁，使用这把锁就不使用主从了，每个节点的地位都是一样的， 这把锁加锁的逻辑需要写入到每一个主丛节点上，只有所有的服务器都写入成功，此时才是加锁成功。假设现在某个节点挂了，那么它去获得锁的时候，只要有一个节点拿不到，都不能算是加锁成功，就保证了加锁的可靠性。

<img src="https://i-blog.csdnimg.cn/direct/a16918acda84463cadf64531da7fb488.png" alt="img" style="zoom: 50%;" />

### 秒杀优化

#### 1. 异步秒杀思路

(1) 当用户下单之后，判断库存是否充足只需要到redis中去根据key找对应的value是否大于0即可。如果不充足，则直接结束，如果充足，继续在redis中判断用户是否可以下单，如果set集合中没有这条数据，说明它可以下单，如果set集合中没有这条记录，则将userId和优惠卷存入到redis中，并且返回0，整个过程需要保证是原子性的，我们可以使用lua来操作。

<img src="https://i-blog.csdnimg.cn/direct/7d7850c854d64fe1b6c3bb31ae3db31b.png" alt="img" style="zoom:50%;" />

(2) 校验通过后，无需等待完整下单流程完成，直接给用户返回 “下单受理成功”（附带订单 ID），同时将下单任务丢入异步队列；后台单独线程消费异步队列中的任务，慢慢执行完整的数据库下单逻辑（创建订单、扣减库存等）；前端通过返回的订单 ID，查询异步下单的最终结果（成功 / 失败）。

#### 2. Redis完成秒杀资格判断

需求

- 新增秒杀优惠券的同时，将优惠券信息保存到Redis中
- 基于Lua脚本，判断秒杀库存、一人一单，决定用户是否抢购成功
- 如果抢购成功，将优惠券id和用户id封装后存入阻塞队列
- 开启线程任务，不断从阻塞队列中获取信息，实现异步下单功能

代码实现

**完整lua表达式**

```Lua
-- 1.参数列表
-- 1.1.优惠券id
local voucherId = ARGV[1]
-- 1.2.用户id
local userId = ARGV[2]
-- 1.3.订单id
local orderId = ARGV[3]

-- 2.数据key
-- 2.1.库存key
local stockKey = 'seckill:stock:' .. voucherId
-- 2.2.订单key
local orderKey = 'seckill:order:' .. voucherId

-- 3.脚本业务
-- 3.1.判断库存是否充足 get stockKey
if(tonumber(redis.call('get', stockKey)) <= 0) then
    -- 3.2.库存不足，返回1
    return 1
end
-- 3.2.判断用户是否下单 SISMEMBER orderKey userId
if(redis.call('sismember', orderKey, userId) == 1) then
    -- 3.3.存在，说明是重复下单，返回2
    return 2
end
-- 3.4.扣库存 incrby stockKey -1
redis.call('incrby', stockKey, -1)
-- 3.5.下单（保存用户）sadd orderKey userId
redis.call('sadd', orderKey, userId)
-- 3.6.发送消息到队列中， XADD stream.orders * k1 v1 k2 v2 ...
redis.call('xadd', 'stream.orders', '*', 'userId', userId, 'voucherId', voucherId, 'id', orderId)
return 0
```

**说明：**

① Lua 里的 `..` 是什么

`..` 是 **Lua 语言的字符串拼接运算符**，作用和 Java 里用 `+` 拼接字符串（比如 `"a" + "b"`）完全一样，只是语法不同。

② if(tonumber(redis.call('get', stockKey)) <= 0) then return 1 end

`tonumber()` 是 Lua 的内置函数，作用是把**字符串类型的数字**转成**数值类型**；

**VoucherOrderServiceImpl**

```java
@Override
public Result seckillVoucher(Long voucherId) {
    //获取用户
    Long userId = UserHolder.getUser().getId();
    long orderId = redisIdWorker.nextId("order");
    // 1.执行lua脚本
    Long result = stringRedisTemplate.execute(
            SECKILL_SCRIPT,
            Collections.emptyList(),
            voucherId.toString(), userId.toString(), String.valueOf(orderId)
    );
    int r = result.intValue();
    // 2.判断结果是否为0
    if (r != 0) {
        // 2.1.不为0 ，代表没有购买资格
        return Result.fail(r == 1 ? "库存不足" : "不能重复下单");
    }
    //TODO 保存阻塞队列
    // 3.返回订单id
    return Result.ok(orderId);
}
```

#### 3. 基于阻塞队列实现秒杀优化

```java
//异步处理线程池
private static final ExecutorService SECKILL_ORDER_EXECUTOR = Executors.newSingleThreadExecutor();

//在类初始化之后执行，因为当这个类初始化好了之后，随时都是有可能要执行的
@PostConstruct
private void init() {
   SECKILL_ORDER_EXECUTOR.submit(new VoucherOrderHandler());
}
// 用于线程池处理的任务
// 当初始化完毕后，就会去从对列中去拿信息
 private class VoucherOrderHandler implements Runnable{

        @Override
        public void run() {
            while (true){
                try {
                    // 1.获取队列中的订单信息
                    VoucherOrder voucherOrder = orderTasks.take();
                    // 2.创建订单
                    handleVoucherOrder(voucherOrder);
                } catch (Exception e) {
                    log.error("处理订单异常", e);
                }
          	 }
        }
     
       private void handleVoucherOrder(VoucherOrder voucherOrder) {
            //1.获取用户
            Long userId = voucherOrder.getUserId();
            // 2.创建锁对象
            RLock redisLock = redissonClient.getLock("lock:order:" + userId);
            // 3.尝试获取锁
            boolean isLock = redisLock.lock();
            // 4.判断是否获得锁成功
            if (!isLock) {
                // 获取锁失败，直接返回失败或者重试
                log.error("不允许重复下单！");
                return;
            }
            try {
				//注意：由于是spring的事务是放在threadLocal中，此时的是多线程，事务会失效
                proxy.createVoucherOrder(voucherOrder);
            } finally {
                // 释放锁
                redisLock.unlock();
            }
    }
     //a
	private BlockingQueue<VoucherOrder> orderTasks =new  ArrayBlockingQueue<>(1024 * 1024);

    @Override
    public Result seckillVoucher(Long voucherId) {
        Long userId = UserHolder.getUser().getId();
        long orderId = redisIdWorker.nextId("order");
        // 1.执行lua脚本
        Long result = stringRedisTemplate.execute(
                SECKILL_SCRIPT,
                Collections.emptyList(),
                voucherId.toString(), userId.toString(), String.valueOf(orderId)
        );
        int r = result.intValue();
        // 2.判断结果是否为0
        if (r != 0) {
            // 2.1.不为0 ，代表没有购买资格
            return Result.fail(r == 1 ? "库存不足" : "不能重复下单");
        }
        VoucherOrder voucherOrder = new VoucherOrder();
        // 2.3.订单id
        long orderId = redisIdWorker.nextId("order");
        voucherOrder.setId(orderId);
        // 2.4.用户id
        voucherOrder.setUserId(userId);
        // 2.5.代金券id
        voucherOrder.setVoucherId(voucherId);
        // 2.6.放入阻塞队列
        orderTasks.add(voucherOrder);
        //3.获取代理对象
         proxy = (IVoucherOrderService)AopContext.currentProxy();
        //4.返回订单id
        return Result.ok(orderId);
    }
     
      @Transactional
    public  void createVoucherOrder(VoucherOrder voucherOrder) {
        Long userId = voucherOrder.getUserId();
        // 5.1.查询订单
        int count = query().eq("user_id", userId).eq("voucher_id", voucherOrder.getVoucherId()).count();
        // 5.2.判断是否存在
        if (count > 0) {
            // 用户已经购买过了
           log.error("用户已经购买过了");
           return ;
        }

        // 6.扣减库存
        boolean success = seckillVoucherService.update()
                .setSql("stock = stock - 1") // set stock = stock - 1
                .eq("voucher_id", voucherOrder.getVoucherId()).gt("stock", 0) // where id = ? and stock > 0
                .update();
        if (!success) {
            // 扣减失败
            log.error("库存不足");
            return ;
        }
        save(voucherOrder);
 
    }
```

**说明：**

① private static final ExecutorService SECKILL_ORDER_EXECUTOR = Executors.newSingleThreadExecutor();

这是 Java 的**线程池**，`Executors.newSingleThreadExecutor()` 会创建一个「只有 1 个工作线程」的线程池 —— 所有任务都由这 1 个线程按顺序处理。

② @PostConstruct private void init() { SECKILL_ORDER_EXECUTOR.submit(new VoucherOrderHandler()); }

`@PostConstruct`：Spring 注解，作用是「当前类被 Spring 初始化完成后（项目启动时），立即执行这个方法」；

③ private class VoucherOrderHandler implements Runnable { ... }

这是一个**内部线程任务类**，实现了 `Runnable` 接口（Java 中 “可被线程执行的任务” 都要实现这个接口），里面的 `run()` 方法是线程要执行的核心逻辑。

### Postman测试方法

#### 1. 发送验证码（不需要登录）

(1) 请求方式：POST

(2) 直连后端：http://localhost:8082/user/code?phone=13100000000

(3) 预期响应

```bash
{
  "success": true
}
```

#### 2. 登录获取 token

(1) 请求方式：POST

(2) 直连后端：http://localhost:8082/user/login

(3) Body（选择 raw，格式 JSON）：

```bash
{
  "phone": "13100000000",
  "code": "518208"
}
```

注意：code 是第一步发送验证码后，在控制台日志里看到的 6 位数字

(4) 预期响应

```bash
"1c3e03a8a5734dd1a8a5285c0d49a63c"
```

这个字符串就是 token，复制保存下来

#### 3. 测试登录状态（验证 token 是否有效）

(1) 请求方式：GET

(2) 直连后端：http://localhost:8082/user/me

(3) Headers：

authorization: 1c3e03a8a5734dd1a8a5285c0d49a63c

(4) 预期响应

```bash
{
  "success": true,
  "data": {
    "id": 1,
    "nickName": "user_xxx",
    "icon": "..."
  }
}
```

#### 4. 秒杀下单（需要登录）

(1) 请求方式：POST

(2) 直连后端：http://localhost:8082/voucher-order/seckill/10

(3) Headers：

authorization: 1c3e03a8a5734dd1a8a5285c0d49a63c

(4) Body：不需要

(5) 可能响应：

```bash
{
  "success": true,
  "data": 1234567890
}
```

### JMeter使用方法

#### 1. 添加线程组

(1) 右键 “测试计划” → 添加 → 线程(用户) → 线程组

(2) 配置

- 线程数(用户数)：并发用户数（如 100）

- Ramp-Up时间(秒)：启动时间（如 10）

- 循环次数：每个线程执行次数（如 1）

<img src="https://i-blog.csdnimg.cn/direct/6c46a765b36a4d479fa28be8c4693697.png" alt="img" style="zoom: 33%;" />

#### 2. 添加 HTTP 请求

(1) 右键 “线程组” → 添加 → 取样器 → HTTP 请求

(2) 配置：

- 名称：秒杀下单（自定义）
- 服务器名称或IP：localhost（或后端服务器IP）
- 端口号：8081（或你的后端端口）
- 方法：POST
- 路径：/voucher-order/seckill/10（你的秒杀接口路径）

<img src="https://i-blog.csdnimg.cn/direct/ecf3ba3200114a0c85f4ab9126e80b81.png" alt="img" style="zoom:33%;" />

#### 3. 添加 HTTP 信息头管理器

(1) 右键 “线程组” → 添加 → 配置元件 → HTTP 信息头管理器

(2) 配置：

- 名称：authorization
- 值：你的登录token（例如：1c3e03a8a5734dd1a8a5285c0d49a63c）

#### 4. 添加监听器（查看结果）

右键 “线程组” → 添加 → 监听器 → 选择：

- 察看结果树：查看每个请求的详细响应（调试用）

- 汇总报告：查看统计信息（吞吐量、错误率等）

- 聚合报告：更详细的性能报告

#### 5. 运行测试

点击顶部工具栏的绿色“启动”按钮

### 消息队列

#### 1. 为什么使用消息队列

阻塞队列是 **JVM 内存内的本地队列**，只适合「单机、简单场景」，实际项目中处处受限：

只能单机使用，不支持分布式

阻塞队列存储在单个 JVM 进程内存中，**多机集群部署时队列无法共享**：不同服务器的阻塞队列相互隔离，任务无法在集群间负载均衡，导致部分机器任务堆积、部分机器空闲，资源利用率极低。

消息无持久化，宕机就丢

阻塞队列的任务仅存在内存中，**服务重启、宕机或 OOM 时，未处理的消息会全部丢失**：在秒杀等核心业务中，这会导致用户已成功下单但订单数据丢失，引发资损和客诉。

#### 2. 认识消息队列

- 消息队列：存储和管理消息，也被称为消息代理（Message Broker）
- 生产者：发送消息到消息队列
- 消费者：从消息队列获取消息并处理消息

#### 3. 基于List实现消息队列（了解即可）

实现原理

队列是入口和出口不在一边，因此我们可以利用：LPUSH 结合 RPOP、或者 RPUSH 结合 LPOP来实现。当队列中没有消息时，RPOP或LPOP操作会返回null，并不像JVM的阻塞队列那样会阻塞并等待消息。因此这里应该使用BRPOP或者BLPOP来实现阻塞效果。

![img](https://i-blog.csdnimg.cn/direct/61e7d19d580c480da05025c32822a8df.png)

优缺点

① 优点：

- 利用Redis存储，不受限于JVM内存上限
- 基于Redis的持久化机制，数据安全性有保证
- 可以满足消息有序性

② 缺点：

- 无法避免消息丢失
- 只支持单消费者

#### 3. 基于PubSub的消息队列（了解即可）

实现原理

SUBSCRIBE channel [channel] ：订阅一个或多个频道

PUBLISH channel msg ：向一个频道发送消息

PSUBSCRIBE pattern[pattern] ：订阅与pattern格式匹配的所有频道

<img src="https://i-blog.csdnimg.cn/direct/7352b329919946c7bebfd3c9f7db6fe2.png" alt="img" style="zoom: 67%;" />

优缺点

① 优点：

- 采用发布订阅模型，支持多生产、多消费

② 缺点：

- 不支持数据持久化
- 无法避免消息丢失
- 消息堆积有上限，超出时数据丢失

#### 4. 基于Stream的消息队列（推荐）

发送消息：XADD 命令

```bash
XADD key [NOMKSTREAM] [MAXLEN|MINID [=|~] threshold [LIMIT count]] *|ID field value [field value ...]
```

**说明：**

- `key`：消息队列名称，队列不存在时**默认自动创建**（`NOMKSTREAM` 可禁止自动创建）。
- `MAXLEN|MINID`：用于限制队列的**最大消息数量**。
- `*`：让 Redis **自动生成消息 ID**（格式：`时间戳-递增数字`，如 `1644805700523-0`）；也可手动指定 ID。
- 消息内容：由多个 `field value` 键值对组成（称为 Entry）。

**示例：**

```bash
# 创建名为 users 的队列，发送消息 {name: jack, age: 21}，自动生成 ID
XADD users * name jack age 21
```

读取消息：`XREAD` 命令

```bash
XREAD [COUNT count] [BLOCK milliseconds] STREAMS key [key ...] ID [ID ...]
```

**说明：**

`① COUNT count`：每次读取的**最大消息数量**。

`② BLOCK milliseconds`：阻塞模式，无消息时阻塞等待，超时后返回 `(nil)`。

`③ STREAMS key`：指定要读取的队列名称。

`④ ID`：起始读取 ID，仅返回**大于该 ID** 的消息：

- `0`：从队列**第一个消息**开始读取。
- `$`：从队列**最新消息**开始读取。

**示例：**

① 读取历史消息：指定起始 ID 为 `0`，从队列第一条消息开始读取。

```bash
XREAD COUNT 1 STREAMS users 0
```

② 阻塞读取最新消息：指定起始 ID 为 `$`，配合 `BLOCK` 实现阻塞等待，无消息时超时返回 `(nil)`

```bash
XREAD COUNT 1 BLOCK 1000 STREAMS users $
```

关键注意点

使用 `$` 读取最新消息时存在**漏读风险**：若处理当前消息期间，队列新增了多条消息，下次调用只会获取到**最新的一条**，中间新增的消息会被跳过。

#### 5. 基于Stream的消息队列-消费者组

创建消费者组

```bash
XGROUP CREATE key groupName ID [MKSTREAM]
```

**说明：**

- key：队列名称
- groupName：消费者组名称
- ID：起始ID标示，$代表队列中最后一个消息，0则代表队列中第一个消息
- MKSTREAM：队列不存在时自动创建队列

**删除指定的消费者组**

```java
XGROUP DESTORY key groupName
```

**给指定的消费者组添加消费者**

```java
XGROUP CREATECONSUMER key groupname consumername
```

**从消费者组读取消息：**

```java
XREADGROUP GROUP group consumer [COUNT count] [BLOCK milliseconds] [NOACK] STREAMS key [key ...] ID [ID ...]
```

**说明：**

- group：消费组名称
- consumer：消费者名称，如果消费者不存在，会自动创建一个消费者
- count：本次查询的最大数量
- BLOCK milliseconds：当没有消息时最长等待时间
- NOACK：无需手动ACK，获取到消息后自动确认（一般不要添加这个）
- STREAMS key：指定队列名称
- ID：获取消息的起始ID：
  - ">"：从下一个未消费的消息开始
  - 其它：根据指定id从pending-list中获取已消费但未确认的消息，例如0，是从pending-list中的第一个消息开始

**Redis Stream 消费者组可靠消费** 的核心逻辑

```java
while(true){
    // 1. 阻塞读取消费者组g1中消费者c1的新消息（队列s1，阻塞2000ms，每次读1条）
    Object msg = redis.call("XREADGROUP GROUP g1 c1 COUNT 1 BLOCK 2000 STREAMS s1 >");
    if(msg == null){
        continue; // 无新消息，继续循环监听
    }
    
    try {
        // 2. 执行业务逻辑处理消息
        handleMessage(msg);
        
        // 【图片中省略但必须加】处理成功后调用XACK确认
        // redis.call("XACK s1 g1 " + msgId);
        
    } catch(Exception e) {
        // 3. 处理失败时，循环重试pending-list中的未确认消息
        while(true){
            // 读取pending-list中已分配但未确认的消息（从ID=0开始）
            Object msg = redis.call("XREADGROUP GROUP g1 c1 COUNT 1 STREAMS s1 0");
            if(msg == null){
                break; // 无未确认消息，退出重试循环
            }
            
            try {
                // 重新处理异常消息
                handleMessage(msg);
                
                // 【图片中省略但必须加】重试成功后ACK确认
                // redis.call("XACK s1 g1 " + msgId);
                
            } catch(Exception e) {
                // 再次失败则继续重试（也可加重试次数限制）
                continue;
            }
        }
    }
}
```

**说明：**

① **必须 ACK**：处理成功后，要调用 `XACK` 命令告诉 Redis “这条消息我处理完了”，消息会从 `pending-list`（未确认消息列表）中移除。

② Object msg = redis.call("XREADGROUP GROUP g1 c1 COUNT 1 STREAMS s1 0");

- `0` 代表从 `pending-list` 中读取**已分配但未确认**的消息，也就是之前处理失败的那条。
- 这是为了**不丢失消息**，保证失败的消息会被反复重试，直到处理成功。

#### 6. 基于Redis的Stream结构作为消息队列，实现异步秒杀下单

需求

- 创建一个Stream类型的消息队列，名为stream.orders
- 修改之前的秒杀下单Lua脚本，在认定有抢购资格后，直接向stream.orders中添加消息，内容包含voucherId、userId、orderId
- 项目启动时，开启一个线程任务，尝试获取stream.orders中的消息，完成下单

VoucherOrderServiceImpl

```java
private class VoucherOrderHandler implements Runnable {

    @Override
    public void run() {
        while (true) {
            try {
                // 1.获取消息队列中的订单信息 XREADGROUP GROUP g1 c1 COUNT 1 BLOCK 2000 STREAMS s1 >
                List<MapRecord<String, Object, Object>> list = stringRedisTemplate.opsForStream().read(
                    Consumer.from("g1", "c1"),
                    StreamReadOptions.empty().count(1).block(Duration.ofSeconds(2)),
                    StreamOffset.create("stream.orders", ReadOffset.lastConsumed())
                );
                // 2.判断订单信息是否为空
                if (list == null || list.isEmpty()) {
                    // 如果为null，说明没有消息，继续下一次循环
                    continue;
                }
                // 解析数据
                MapRecord<String, Object, Object> record = list.get(0);
                Map<Object, Object> value = record.getValue();
                VoucherOrder voucherOrder = BeanUtil.fillBeanWithMap(value, new VoucherOrder(), true);
                // 3.创建订单
                createVoucherOrder(voucherOrder);
                // 4.确认消息 XACK
                stringRedisTemplate.opsForStream().acknowledge("s1", "g1", record.getId());
            } catch (Exception e) {
                log.error("处理订单异常", e);
                //处理异常消息
                handlePendingList();
            }
        }
    }

    private void handlePendingList() {
        while (true) {
            try {
                // 1.获取pending-list中的订单信息 XREADGROUP GROUP g1 c1 COUNT 1 BLOCK 2000 STREAMS s1 0
                List<MapRecord<String, Object, Object>> list = stringRedisTemplate.opsForStream().read(
                    Consumer.from("g1", "c1"),
                    StreamReadOptions.empty().count(1),
                    StreamOffset.create("stream.orders", ReadOffset.from("0"))
                );
                // 2.判断订单信息是否为空
                if (list == null || list.isEmpty()) {
                    // 如果为null，说明没有异常消息，结束循环
                    break;
                }
                // 解析数据
                MapRecord<String, Object, Object> record = list.get(0);
                Map<Object, Object> value = record.getValue();
                VoucherOrder voucherOrder = BeanUtil.fillBeanWithMap(value, new VoucherOrder(), true);
                // 3.创建订单
                createVoucherOrder(voucherOrder);
                // 4.确认消息 XACK
                stringRedisTemplate.opsForStream().acknowledge("s1", "g1", record.getId());
            } catch (Exception e) {
                log.error("处理pendding订单异常", e);
                try{
                    Thread.sleep(20);
                }catch(Exception e){
                    e.printStackTrace();
                }
            }
        }
    }
}
```

**说明：**

```java
// 核心：从消息队列读取消息
List<MapRecord<String, Object, Object>> list = stringRedisTemplate.opsForStream().read(
    Consumer.from("g1", "c1"),  // 🔴 消息队列-消费组配置：组名g1，消费者名c1
    StreamReadOptions.empty().count(1).block(Duration.ofSeconds(2)),  // 🔴 消息队列-读取规则：每次读1条，没消息则阻塞等2秒
    StreamOffset.create("stream.orders", ReadOffset.lastConsumed())  // 🔴 消息队列-指定队列名+读取位置：队列名stream.orders，读未消费的新消息
);
```

- `stringRedisTemplate.opsForStream()`：拿到操作 Redis 消息队列的 “工具”，所有消息队列的读写都靠它。
- 消费组（g1）+ 消费者（c1）：可以理解为 “客服组 g1 里的客服 c1”，多个消费者能分摊处理队列消息，避免单线程扛不住。
- `stream.orders`：是你的消息队列名称。
- `block(2秒)`：队列没消息时不做空循环，等 2 秒再查，节省资源。

② 为什么 `list 为空就 break`？

- `list` 是从 `Pending List` 读取失败消息的结果，代码里设置了 `count(1)`（每次只读 1 条）；
- 如果 `list == null/空`，说明 **Pending List 里已经没有待重试的失败消息了**（所有失败订单都处理完了）；
- 此时再继续死循环没有意义，所以 `break` 跳出循环，结束本次失败消息的处理流程（等下次有新的失败消息时，这个方法会再次被调用）。

③ 为什么要 `list.get(0)`？

- 代码里 `StreamReadOptions.empty().count(1)` 明确指定了「每次只读取 1 条消息」，所以 `list` 里最多只有 1 个元素；
- `list.get(0)` 就是取出这**唯一的一条失败消息**，只有拿到这条消息，才能解析里面的订单数据（用户 ID、优惠券 ID），进而重新处理订单。

④ 为什么要调用 `acknowledge` 确认消息？

- 这是 Redis Stream 的「消息确认机制」，作用是告诉 Redis：**这条失败的订单消息我已经重新处理成功了，请把它从 Pending List 中移除**；
- 如果不确认（ACK）：Redis 会一直把这条消息留在 Pending List 里，后续这个方法会反复读取这条消息，导致「同一个失败订单被重复处理」（比如用户一个订单被多次扣库存）；

⑤ 这个方法的执行流程

```bash
1. 进入死循环，准备捞取失败订单；
2. 从Pending List里读1条失败的订单消息；
3. 如果没读到（list空），说明失败订单都处理完了，跳出循环；
4. 如果读到了，解析成订单对象，重新尝试处理（加锁+扣库存+存订单）；
5. 处理成功后，告诉Redis“这条消息搞定了，你可以删了”；
6. 重复步骤2-5，直到所有失败消息都处理完。
```

### 达人探店

#### 1. 查看探店笔记

BlogServiceImpl

```java
@Override
public Result queryBlogById(Long id) {
    // 1.查询blog
    Blog blog = getById(id);
    if (blog == null) {
        return Result.fail("笔记不存在！");
    }
    // 2.查询blog有关的用户
    queryBlogUser(blog);
  
    return Result.ok(blog);
}
```

```java
    private void queryBlogUser(Blog blog) {
        Long userId = blog.getUserId();
        com.hmdp.entity.User user = userService.getById(userId);
        blog.setName(user.getNickName());
        blog.setIcon(user.getIcon());
    }
```

**说明：**

这个私有方法的核心作用是：**根据博客（Blog）中的用户 ID，查询对应的用户信息，并把用户的「昵称」和「头像」两个核心字段填充到博客对象中**，最终让博客对象包含发布者的展示信息（而非完整的用户对象），适配前端详情页只需要昵称 / 头像的展示需求。

#### 2. 点赞功能

需求

- 同一个用户只能点赞一次，再次点击则取消点赞
- 如果当前用户已经点赞，则点赞按钮高亮显示（前端已实现，判断字段Blog类的isLike属性）

实现步骤

- 给Blog类中添加一个isLike字段，标示是否被当前用户点赞
- 修改点赞功能，利用Redis的set集合判断是否点赞过，未点赞过则点赞数+1，已点赞过则点赞数-1
- 修改根据id查询Blog的业务，判断当前登录用户是否点赞过，赋值给isLike字段
- 修改分页查询Blog业务，判断当前登录用户是否点赞过，赋值给isLike字段

代码实现

① 在Blog 添加一个字段

```java
@TableField(exist = false)
private Boolean isLike;
```

② 修改代码

```java
 @Override
    public Result likeBlog(Long id){
        // 1.获取登录用户
        Long userId = UserHolder.getUser().getId();
        // 2.判断当前登录用户是否已经点赞
        String key = BLOG_LIKED_KEY + id;
        Boolean isMember = stringRedisTemplate.opsForSet().isMember(key, userId.toString());
        if(BooleanUtil.isFalse(isMember)){
             //3.如果未点赞，可以点赞
            //3.1 数据库点赞数+1
            boolean isSuccess = update().setSql("liked = liked + 1").eq("id", id).update();
            //3.2 保存用户到Redis的set集合
            if(isSuccess){
                stringRedisTemplate.opsForSet().add(key,userId.toString());
            }
        }else{
             //4.如果已点赞，取消点赞
            //4.1 数据库点赞数-1
            boolean isSuccess = update().setSql("liked = liked - 1").eq("id", id).update();
            //4.2 把用户从Redis的set集合移除
            if(isSuccess){
                stringRedisTemplate.opsForSet().remove(key,userId.toString());
            }
        }
```

#### 3. 点赞排行榜

BlogServiceImpl

```java
   @Override
    public Result likeBlog(Long id) {
        // 1.获取登录用户
        Long userId = UserHolder.getUser().getId();
        // 2.判断当前登录用户是否已经点赞
        String key = BLOG_LIKED_KEY + id;
        Double score = stringRedisTemplate.opsForZSet().score(key, userId.toString());
        if (score == null) {
            // 3.如果未点赞，可以点赞
            // 3.1.数据库点赞数 + 1
            boolean isSuccess = update().setSql("liked = liked + 1").eq("id", id).update();
            // 3.2.保存用户到Redis的set集合  zadd key value score
            if (isSuccess) {
                stringRedisTemplate.opsForZSet().add(key, userId.toString(), System.currentTimeMillis());
            }
        } else {
            // 4.如果已点赞，取消点赞
            // 4.1.数据库点赞数 -1
            boolean isSuccess = update().setSql("liked = liked - 1").eq("id", id).update();
            // 4.2.把用户从Redis的set集合移除
            if (isSuccess) {
                stringRedisTemplate.opsForZSet().remove(key, userId.toString());
            }
        }
        return Result.ok();
    }

    private void isBlogLiked(Blog blog) {
        // 1.获取登录用户
        UserDTO user = UserHolder.getUser();
        if (user == null) {
            // 用户未登录，无需查询是否点赞
            return;
        }
        Long userId = user.getId();
        // 2.判断当前登录用户是否已经点赞
        String key = "blog:liked:" + blog.getId();
        Double score = stringRedisTemplate.opsForZSet().score(key, userId.toString());
        blog.setIsLike(score != null);
    }
```

**说明：**

① Double score = stringRedisTemplate.opsForZSet().score(key, userId.toString());

作用：查询 **指定博客的点赞集合** 中，**当前用户** 是否存在，并返回它的分数。

**业务判断：**

- `score == null` → 用户**没点赞**
- `score != null` → 用户**已点赞**

② stringRedisTemplate.opsForZSet().add(key, userId.toString(), System.currentTimeMillis());

作用：向 ZSet 中**添加一个点赞用户**，三个参数：

- 博客点赞的 key
- 点赞用户 ID
- 分数（当前时间戳）

**关键点：**

- ZSet 元素唯一 → 同一个用户重复点赞会被自动去重（完美适配「一人只能点一次赞」）
- 用**时间戳当分数** → 后续可以直接按时间倒序，展示「最新点赞的用户列表」（普通 Set 做不到排序，这就是用 ZSet 的原因！）

BlogController

```java
@GetMapping("/likes/{id}")
public Result queryBlogLikes(@PathVariable("id") Long id) {

    return blogService.queryBlogLikes(id);
}
```

BlogService

```java
@Override
public Result queryBlogLikes(Long id) {
    String key = BLOG_LIKED_KEY + id;
    // 1.查询top5的点赞用户 zrange key 0 4
    Set<String> top5 = stringRedisTemplate.opsForZSet().range(key, 0, 4);
    if (top5 == null || top5.isEmpty()) {
        return Result.ok(Collections.emptyList());
    }
    // 2.解析出其中的用户id
    List<Long> ids = top5.stream().map(Long::valueOf).collect(Collectors.toList());
    String idStr = StrUtil.join(",", ids);
    // 3.根据用户id查询用户 WHERE id IN ( 5 , 1 ) ORDER BY FIELD(id, 5, 1)
    List<UserDTO> userDTOS = userService.query()
            .in("id", ids).last("ORDER BY FIELD(id," + idStr + ")").list()
            .stream()
            .map(user -> BeanUtil.copyProperties(user, UserDTO.class))
            .collect(Collectors.toList());
    // 4.返回
    return Result.ok(userDTOS);
}
```

**说明：**

① List<Long> ids = top5.stream().map(Long::valueOf).collect(Collectors.toList());

`top5` 是你从 Redis 取出来的 **Set<String>**，里面是：`["1001", "1002", "1003"]`（字符串格式的用户 ID），数据库查询必须用数字类型（Long），所以要转换。

**map(Long::valueOf)**

`map` = 格式转换

```
Long::valueOf` = 把字符串 `"1001"` 转成数字 `1001
```

② List<UserDTO> userDTOS = userService.query() .in("id", ids) .last("ORDER BY FIELD(id," + idStr + ")") .list() .stream() .map(user -> BeanUtil.copyProperties(user, UserDTO.class)) .collect(Collectors.toList());

1). userService.query()

这是 **MyBatis-Plus（MP）的链式查询**

- 作用：开启一个查询构造器，不用写复杂的 SQL，用代码拼接查询条件
- 等价于：`SELECT * FROM user`

2). .in("id", ids)

MP 的批量查询条件

- 含义：`id 在 ids 集合中`
- 对应 SQL：`WHERE id IN (1001,1002,1003,1004,1005)`
- 作用：只查我们需要的**前 5 个点赞用户**，不查全表

3). .last ("ORDER BY FIELD (id," + idStr + ")")

先讲背景：

数据库用 `IN` 查询时，**返回的用户是乱序的**！比如你查 `IN (1,2,3)`，数据库可能返回 `3,1,2`，会打乱 Redis 里**点赞的先后顺序**。

两个关键点：

- **`last()`**MP 的方法：**手动在 SQL 最后追加一段代码**（这里用来加排序）
- **`ORDER BY FIELD(id, 1,2,3,4,5)`**MySQL 专属函数，作用：**强制让结果按照我指定的 ID 顺序排序**

举个例子：

- `idStr = "1001,1002,1003,1004,1005"`
- 拼接后 SQL：`ORDER BY FIELD(id,1001,1002,1003,1004,1005)`
- 结果：**用户必须按 1001→1002→1003→1004→1005 的顺序返回**完美对应 Redis 里的**点赞先后顺序**！

4). String idStr = StrUtil.join(",", ids);

`StrUtil.join` 是 **hutool 工具类的拼接方法**，作用：把一个集合 / 数组，用指定符号拼接成一个字符串

举个最直观的例子：

- 输入：`ids = [101, 102, 103]`
- 拼接符号：`,`
- 输出：`idStr = "101,102,103"`

为什么要拼这个字符串？

为了给后面的 **SQL 排序** 用！数据库需要这种**逗号分隔的格式**。

### 好友关注

#### 1. 关注和取消关注

FollowController

```java
//关注
@PutMapping("/{id}/{isFollow}")
public Result follow(@PathVariable("id") Long followUserId, @PathVariable("isFollow") Boolean isFollow) {
    return followService.follow(followUserId, isFollow);
}
//取消关注
@GetMapping("/or/not/{id}")
public Result isFollow(@PathVariable("id") Long followUserId) {
      return followService.isFollow(followUserId);
}
```

FollowService

```java
取消关注service
@Override
public Result isFollow(Long followUserId) {
        // 1.获取登录用户
        Long userId = UserHolder.getUser().getId();
        // 2.查询是否关注 select count(*) from tb_follow where user_id = ? and follow_user_id = ?
        Integer count = query().eq("user_id", userId).eq("follow_user_id", followUserId).count();
        // 3.判断
        return Result.ok(count > 0);
    }

 关注service
 @Override
    public Result follow(Long followUserId, Boolean isFollow) {
        // 1.获取登录用户
        Long userId = UserHolder.getUser().getId();
        String key = "follows:" + userId;
        // 1.判断到底是关注还是取关
        if (isFollow) {
            // 2.关注，新增数据
            Follow follow = new Follow();
            follow.setUserId(userId);
            follow.setFollowUserId(followUserId);
            boolean isSuccess = save(follow);

        } else {
            // 3.取关，删除 delete from tb_follow where user_id = ? and follow_user_id = ?
            remove(new QueryWrapper<Follow>()
                    .eq("user_id", userId).eq("follow_user_id", followUserId));

        }
        return Result.ok();
    }
```

**说明：**

| 字段           | 含义                            |
| -------------- | ------------------------------- |
| `userId`       | **当前登录用户**（你自己）      |
| `followUserId` | **要关注 / 取关的用户**（博主） |
| `tb_follow` 表 | 专门存**关注关系**的表          |
| `isFollow`     | `true`= 关注，`false`= 取关     |

① `if (isFollow)` → **关注（新增数据）**

```java
// 新建一个【关注关系】对象
Follow follow = new Follow();
// 设置：关注人是「我」（当前登录用户）
follow.setUserId(userId);
// 设置：被关注的人是「对方」（博主）
follow.setFollowUserId(followUserId);
// 把这条关注记录 保存到数据库
boolean isSuccess = save(follow);
```

- **`Follow follow = new Follow();`**数据库里有一张表叫 `tb_follow`（关注表），我们要往表里加一条数据，就得先创建一个对应的对象。
- **`setUserId(userId)`**填数据：**关注的人是我**（我是主动关注的一方）。
- **`setFollowUserId(followUserId)`**填数据：**我关注的人是他**（对方是被关注的博主）。
- **`save(follow)`**MyBatis-Plus 提供的方法，**直接把这条关注数据插入数据库**。

② `else` → **取关（删除数据）**

```java
remove(new QueryWrapper<Follow>()
    .eq("user_id", userId)          // 条件1：关注人是我
    .eq("follow_user_id", followUserId) // 条件2：被关注人是他
);
```

new QueryWrapper<Follow>()

→ **删除条件**

翻译：我不能乱删，必须告诉我**删哪一行**

#### 2. 共同关注

代码实现

```java
// UserController 根据id查询用户
@GetMapping("/{id}")
public Result queryUserById(@PathVariable("id") Long userId){
	// 查询详情
	User user = userService.getById(userId);
	if (user == null) {
		return Result.ok();
	}
	UserDTO userDTO = BeanUtil.copyProperties(user, UserDTO.class);
	// 返回
	return Result.ok(userDTO);
}

// BlogController  根据id查询博主的探店笔记
@GetMapping("/of/user")
public Result queryBlogByUserId(
		@RequestParam(value = "current", defaultValue = "1") Integer current,
		@RequestParam("id") Long id) {
	// 根据用户查询
	Page<Blog> page = blogService.query()
			.eq("user_id", id).page(new Page<>(current, SystemConstants.MAX_PAGE_SIZE));
	// 获取当前页数据
	List<Blog> records = page.getRecords();
	return Result.ok(records);
}
```

**说明：**

**① @PathVariable 和 @RequestParam 的区别**

 `@PathVariable`（路径参数，写在 URL `/` 里的）， `@RequestParam` 是 **查询参数**，写在 URL `?` 后面的。

| 注解            | 位置              | 例子                |
| --------------- | ----------------- | ------------------- |
| `@PathVariable` | URL 路径 `/` 里   | `/100/true`         |
| `@RequestParam` | URL 问号 `?` 后面 | `?current=1&id=100` |

② blogService.query()

→ 翻译：**我要查 blog 表（博客表）的数据**

→ 等价 SQL：`SELECT * FROM blog`

③ .page(分页参数)

.page(new Page<>(current, SystemConstants.MAX_PAGE_SIZE));

这是**MyBatis-Plus 分页方法**，两个参数：

- **`current`**：当前页码（比如 1 = 第一页，2 = 第二页）
- **`SystemConstants.MAX_PAGE_SIZE`**：固定值，比如 **10** → 一页显示 10 条博客

④ page.getRecords()

→ 翻译：**从分页结果里，把「当前页的博客列表」拿出来**

→ 结果：`[博客1, 博客2, ..., 博客10]`

修改FollowServiceImpl

改造原因：我们需要在用户关注了某位用户后，需要将数据放入到set集合中，方便后续进行共同关注，同时当取消关注时，也需要从set集合中进行删除。set集合可以实现交集、并集、补集的功能。

```java
@Override
public Result followCommons(Long id) {
    // 1.获取当前用户
    Long userId = UserHolder.getUser().getId();
    String key = "follows:" + userId;
    // 2.求交集
    String key2 = "follows:" + id;
    Set<String> intersect = stringRedisTemplate.opsForSet().intersect(key, key2);
    if (intersect == null || intersect.isEmpty()) {
        // 无交集
        return Result.ok(Collections.emptyList());
    }
    // 3.解析id集合
    List<Long> ids = intersect.stream().map(Long::valueOf).collect(Collectors.toList());
    // 4.查询用户
    List<UserDTO> users = userService.listByIds(ids)
            .stream()
            .map(user -> BeanUtil.copyProperties(user, UserDTO.class))
            .collect(Collectors.toList());
    return Result.ok(users);
}
```

**说明：**

.collect(Collectors.toList())

把转换好的数字 ID，打包成一个**列表** 

#### 3. Feed流实现方案

针对好友的操作，采用的是Timeline的方式，只需要拿到我们关注用户的信息，然后按照时间排序即可，因此采用Timeline的模式。该模式的实现方案有三种：

- 拉模式
- 推模式
- 推拉结合

拉模式

① 核心逻辑：

当张三、李四和王五发了消息后，都会保存在自己的邮箱中。假设赵六要读取信息，那么它会从读取它自己的收件箱，此时系统会从它关注的人群中，把它关注人的信息全部都进行拉取，然后在进行排序。

<img src="https://i-blog.csdnimg.cn/direct/e51d080b70f84f81b864597f8ee3a58a.png" alt="img" style="zoom:50%;" />

② 优点：比较节约空间，因为赵六在读信息时，并没有重复读取，而且读取完之后可以把它的收件箱进行清楚。

③ 缺点：比较延迟，当用户读取数据时才去关注的人里边去读取数据，假设用户关注了大量的用户，那么此时就会拉取海量的内容，对服务器压力巨大。

推模式

① 核心逻辑：

推模式是没有写邮箱的，当张三写了一个内容，此时会主动的把张三写的内容发送到它的粉丝收件箱中去，假设此时李四再来读取，就不用再去临时拉取了。

<img src="https://i-blog.csdnimg.cn/direct/0c469091fc34406d9c2a2cb79fb2356a.png" alt="img" style="zoom:50%;" />

② 优点：时效快，不用临时拉取。

③ 缺点：内存压力大，假设一个大V写信息，很多人关注它， 就会写很多分数据到粉丝那边去

推拉模式

推拉模式是一个折中的方案。

① 站在发件人这一端，如果是个普通的人，那么我们采用写扩散的方式，直接把数据写入到它的粉丝中去，因为普通的人它的粉丝关注量比较小，所以这样做没有压力。如果是大V，那么它是直接将数据先写入到一份到发件箱里边去，然后再直接写一份到活跃粉丝收件箱里边去。

② 现在站在收件人这端来看，如果是活跃粉丝，那么大V和普通的人发的都会直接写入到自己收件箱里边来，而如果是普通的粉丝，由于它们上线不是很频繁，所以等它们上线时，再从发件箱里边去拉信息。

<img src="https://i-blog.csdnimg.cn/direct/420ed1e92f2844f5b8abfbfab50ff300.png" alt="img" style="zoom: 50%;" />

#### 推送到粉丝收件箱

##### 需求

- 修改新增探店笔记的业务，在保存blog到数据库的同时，推送到粉丝的收件箱
- 收件箱满足可以根据时间戳排序，必须用Redis的数据结构实现
- 查询收件箱数据时，可以实现分页查询

##### Feed流的分页问题

① 传统分页

- **t1 时刻**：取第 1 页（`page=1, size=5`），拿到`10,9,8,7,6`。
- **t2 时刻**：新增一条内容`11`，数据整体后移。
- **t3 时刻**：取第 2 页（`page=2, size=5`），按传统逻辑从第 6 条开始取，拿到`6,5,4,3,2`。
- **结果**：`6`在第 1 页和第 2 页都出现了，**数据重复**。

<img src="https://i-blog.csdnimg.cn/direct/e68b3d137cf944d2a367d75ff4f8b249.png" alt="img" style="zoom: 50%;" />

② 滚动分页

- **t1 时刻**：首次加载，`lastId = ∞`（无前置数据），取前 5 条`10,9,8,7,6`，记录`lastId = 6`。
- **t2 时刻**：新增内容`11`，插入到最顶部，不影响已记录的`6`。
- **t3 时刻**：加载下一页，传入`lastId = 6`，从`6`之后的`5`开始取，拿到`5,4,3,2,1`，无重复。

<img src="https://i-blog.csdnimg.cn/direct/7cc3552352c54df9b1b78c5cca38ffe7.png" alt="img" style="zoom: 50%;" />

##### 代码实现

```java
@Override
public Result saveBlog(Blog blog) {
    // 1.获取登录用户
    UserDTO user = UserHolder.getUser();
    blog.setUserId(user.getId());
    // 2.保存探店笔记
    boolean isSuccess = save(blog);
    if(!isSuccess){
        return Result.fail("新增笔记失败!");
    }
    // 3.查询笔记作者的所有粉丝 select * from tb_follow where follow_user_id = ?
    List<Follow> follows = followService.query().eq("follow_user_id", user.getId()).list();
    // 4.推送笔记id给所有粉丝
    for (Follow follow : follows) {
        // 4.1.获取粉丝id
        Long userId = follow.getUserId();
        // 4.2.推送
        String key = FEED_KEY + userId;
        stringRedisTemplate.opsForZSet().add(key, blog.getId().toString(), System.currentTimeMillis());
    }
    // 5.返回id
    return Result.ok(blog.getId());
}
```

#### 5. 实现分页查询收邮箱

需求

① 每次查询完成后，我们要分析出查询出数据的最小时间戳，这个值会作为下一次查询的条件

② 我们需要找到与上一次查询相同的查询个数作为偏移量，下次查询时，跳过这些查询过的数据，拿到我们需要的数据

| 参数     | 含义                             | 核心目的                                                     |
| -------- | -------------------------------- | ------------------------------------------------------------ |
| `lastId` | 上一次查询结果里的**最小时间戳** | 限定本次查询只加载「比这个时间更早」的 Blog，保证数据按时间倒序加载，避免重复获取 |
| `offset` | 上一次查询返回的**Blog 数量**    | 用来跳过已经加载过的数据，实现 “下一页” 的翻页效果           |

代码实现

① 定义出来具体的返回值实体类

```java
@Data
public class ScrollResult {
    private List<?> list;
    private Long minTime;
    private Integer offset;
}
```

② BlogController

```java
@GetMapping("/of/follow")
public Result queryBlogOfFollow(
    @RequestParam("lastId") Long max, @RequestParam(value = "offset", defaultValue = "0") Integer offset){
    return blogService.queryBlogOfFollow(max, offset);
}
```

③ BlogServiceImpl

```java
@Override
public Result queryBlogOfFollow(Long max, Integer offset) {
    // 1.获取当前用户
    Long userId = UserHolder.getUser().getId();
    // 2.查询收件箱 ZREVRANGEBYSCORE key Max Min LIMIT offset count
    String key = FEED_KEY + userId;
    Set<ZSetOperations.TypedTuple<String>> typedTuples = stringRedisTemplate.opsForZSet()
        .reverseRangeByScoreWithScores(key, 0, max, offset, 2);
    // 3.非空判断
    if (typedTuples == null || typedTuples.isEmpty()) {
        return Result.ok();
    }
    // 4.解析数据：blogId、minTime（时间戳）、offset
    List<Long> ids = new ArrayList<>(typedTuples.size());
    long minTime = 0; // 2
    int os = 1; // 2
    for (ZSetOperations.TypedTuple<String> tuple : typedTuples) { // 5 4 4 2 2
        // 4.1.获取id
        ids.add(Long.valueOf(tuple.getValue()));
        // 4.2.获取分数(时间戳）
        long time = tuple.getScore().longValue();
        if(time == minTime){
            os++;
        }else{
            minTime = time;
            os = 1;
        }
    }
	os = minTime == max ? os : os + offset;
    // 5.根据id查询blog
    String idStr = StrUtil.join(",", ids);
    List<Blog> blogs = query().in("id", ids).last("ORDER BY FIELD(id," + idStr + ")").list();

    for (Blog blog : blogs) {
        // 5.1.查询blog有关的用户
        queryBlogUser(blog);
        // 5.2.查询blog是否被点赞
        isBlogLiked(blog);
    }

    // 6.封装并返回
    ScrollResult r = new ScrollResult();
    r.setList(blogs);
    r.setOffset(os);
    r.setMinTime(minTime);

    return Result.ok(r);
}
```

**说明：**

① List<Long> ids = new ArrayList<>(typedTuples.size());

- `List<Long>`：创建一个**列表**，里面专门存 **数字类型的博客 ID**（数据库里的 ID 是数字，不是字符串）

- `ids`：列表的名字，意思就是 **id 集合**

- `new ArrayList<>()`：创建列表对象

- ```
  typedTuples.size()
  ```

  ：

  提前指定列表的大小

  - 比如 Redis 查到了 2 条数据，列表就直接开 2 个位置
  - 作用：**优化性能**，不用让列表自动扩容

② String idStr = tuple.getValue(); ids.add(Long.valueOf(idStr));

- `tuple`：循环中**每一个 Redis 包裹**（包含博客 ID + 时间戳）

- `tuple.getValue()`：**拿出包裹里的博客 ID**（注意：是字符串格式，比如 "1001"）

- ```
  Long.valueOf(idStr)
  ```

  ：

  把字符串 ID 转成 数字 ID

  - 因为数据库里的 ID 是 `Long` 数字类型，字符串查不到数据，必须转类型

- `ids.add(...)`：**把转换后的数字 ID，放进刚才创建的列表里**

③ List<Blog> blogs = query().in("id", ids).last("ORDER BY FIELD(id," + idStr + ")").list();

1). 问题

Redis 查出的 `blogId` 是**按时间倒序**的，但 MySQL 的 `IN` 查询**不会保证返回顺序**！直接查会导致博客顺序乱掉。

2). 解决方案

`ORDER BY FIELD(id, 1,2,3)`：强制让数据库返回的顺序 **和 Redis 中的 id 顺序完全一致**，保证前端展示顺序正确。

### 附近商户

#### 1. GEO数据结构的基本用法

GEO就是Geolocation的简写形式，代表地理坐标。Redis在3.2版本中加入了对GEO的支持，允许存储地理坐标信息，帮助我们根据经纬度来检索数据。常见的命令有：

- GEOADD：添加一个地理空间信息，包含：经度（longitude）、纬度（latitude）、值（member）
- GEODIST：计算指定的两个点之间的距离并返回
- GEOHASH：将指定member的坐标转为hash字符串形式并返回
- GEOPOS：返回指定member的坐标
- GEORADIUS：指定圆心、半径，找到该圆内包含的所有member，并按照与圆心之间的距离排序后返回。6.以后已废弃
- GEOSEARCH：在指定范围内搜索member，并按照与指定点之间的距离排序后返回。范围可以是圆形或矩形。6.2.新功能
- GEOSEARCHSTORE：与GEOSEARCH功能一致，不过可以把结果存储到一个指定的key。6.2.新功能

#### 2. 导入店铺数据到GEO

Redis GEO 数据结构设计

① 按「商家类型」分组存储

Redis GEO 本身**不支持额外的类型筛选条件**（比如只查美食、排除 KTV），所以我们用**分组**来解决：

- 给每种商家类型建一个独立的 GEO 集合，Key 格式为：

  ```
  shop:geo:{类型}
  ```

  - 美食类：`shop:geo:美食`
  - KTV 类：`shop:geo:KTV`

- 这样用户选「美食」时，直接查询 `shop:geo:美食`，天然就过滤了类型，只查美食商家。

② GEO 里只存「商家 ID」，不存完整信息

Redis 是内存数据库，存太多数据会占满内存，所以：

- **Value（member）**：只存商家的**ID**（比如海底捞的 ID 是 1，就存 "1"）
- **Score**：Redis 自动把经纬度转换成 GeoHash 值，用来计算距离和排序
- 完整的商家信息（名称、地址、评分等）依然存在数据库（MySQL）里，之后用 ID 去查。

代码实现

```java
@Test
void loadShopData() {
    // 1.查询店铺信息
    List<Shop> list = shopService.list();
    // 2.把店铺分组，按照typeId分组，typeId一致的放到一个集合
    Map<Long, List<Shop>> map = list.stream().collect(Collectors.groupingBy(Shop::getTypeId));
    // 3.分批完成写入Redis
    for (Map.Entry<Long, List<Shop>> entry : map.entrySet()) {
        // 3.1.获取类型id
        Long typeId = entry.getKey();
        String key = SHOP_GEO_KEY + typeId;
        // 3.2.获取同类型的店铺的集合
        List<Shop> value = entry.getValue();
        List<RedisGeoCommands.GeoLocation<String>> locations = new ArrayList<>(value.size());
        // 3.3.写入redis GEOADD key 经度 纬度 member
        for (Shop shop : value) {
            // stringRedisTemplate.opsForGeo().add(key, new Point(shop.getX(), shop.getY()), shop.getId().toString());
            locations.add(new RedisGeoCommands.GeoLocation<>(
                    shop.getId().toString(),
                    new Point(shop.getX(), shop.getY())
            ));
        }
        stringRedisTemplate.opsForGeo().add(key, locations);
    }
}
```

**说明：**

① Map<Long, List<Shop>> map = list.stream() .collect(Collectors.groupingBy(Shop::getTypeId));

- 用 `groupingBy(Shop::getTypeId)` 把所有店铺，按**类型 ID**分成一组一组；
- 最终得到一个 `Map`：**key = 类型 ID，value = 该类型的所有店铺**；
- 后续给**每个类型创建一个独立的 Redis GEO Key**（比如 `shop:geo:1` 是美食店，`shop:geo:2` 是 KTV），查询时直接查对应 Key，天然过滤类型。

② 往箱子里「装每个店铺的包裹」

```java
for (Shop shop : value) {
    locations.add(
        new GeoLocation<>(
            shop.getId().toString(),  // 包裹里的「快递单号」：店铺ID
            new Point(shop.getX(), shop.getY())  // 包裹里的「收货地址」：经纬度
        )
    );
}
```

- **`shop.getId().toString()`**：把店铺 ID 转成字符串，作为 Redis GEO 里的 `member`（相当于快递单号，用来后续查询店铺信息）
- **`new Point(shop.getX(), shop.getY())`**：封装店铺的经纬度

#### 3. 实现附近商户功能

ShopController

```java
@GetMapping("/of/type")
public Result queryShopByType(
        @RequestParam("typeId") Integer typeId,
        @RequestParam(value = "current", defaultValue = "1") Integer current,
        @RequestParam(value = "x", required = false) Double x,
        @RequestParam(value = "y", required = false) Double y
) {
   return shopService.queryShopByType(typeId, current, x, y);
}
```

ShopServiceImpl

```java
@Override
    public Result queryShopByType(Integer typeId, Integer current, Double x, Double y) {
        // 1.判断是否需要根据坐标查询
        if (x == null || y == null) {
            // 不需要坐标查询，按数据库查询
            Page<Shop> page = query()
                    .eq("type_id", typeId)
                    .page(new Page<>(current, SystemConstants.DEFAULT_PAGE_SIZE));
            // 返回数据
            return Result.ok(page.getRecords());
        }

        // 2.计算分页参数
        int from = (current - 1) * SystemConstants.DEFAULT_PAGE_SIZE;
        int end = current * SystemConstants.DEFAULT_PAGE_SIZE;

        // 3.查询redis、按照距离排序、分页。结果：shopId、distance
        String key = SHOP_GEO_KEY + typeId;
        GeoResults<RedisGeoCommands.GeoLocation<String>> results = stringRedisTemplate.opsForGeo() // GEOSEARCH key BYLONLAT x y BYRADIUS 10 WITHDISTANCE
                .search(
                        key,
                        GeoReference.fromCoordinate(x, y),
                        new Distance(5000),
                        RedisGeoCommands.GeoSearchCommandArgs.newGeoSearchArgs().includeDistance().limit(end)
                );
        // 4.解析出id
        if (results == null) {
            return Result.ok(Collections.emptyList());
        }
        List<GeoResult<RedisGeoCommands.GeoLocation<String>>> list = results.getContent();
        if (list.size() <= from) {
            // 没有下一页了，结束
            return Result.ok(Collections.emptyList());
        }
        // 4.1.截取 from ~ end的部分
        List<Long> ids = new ArrayList<>(list.size());
        Map<String, Distance> distanceMap = new HashMap<>(list.size());
        list.stream().skip(from).forEach(result -> {
            // 4.2.获取店铺id
            String shopIdStr = result.getContent().getName();
            ids.add(Long.valueOf(shopIdStr));
            // 4.3.获取距离
            Distance distance = result.getDistance();
            distanceMap.put(shopIdStr, distance);
        });
        // 5.根据id查询Shop
        String idStr = StrUtil.join(",", ids);
        List<Shop> shops = query().in("id", ids).last("ORDER BY FIELD(id," + idStr + ")").list();
        for (Shop shop : shops) {
            shop.setDistance(distanceMap.get(shop.getId().toString()).getValue());
        }
        // 6.返回
        return Result.ok(shops);
    }
```

**说明：**

① .page(new Page<>(current, 每页条数))

- `current`：前端传的**当前页码**（比如第 1 页、第 2 页）
- `SystemConstants.DEFAULT_PAGE_SIZE`：**每页默认显示多少条店铺**（比如 10 条）

② return Result.ok(page.getRecords());

`Page` 分页对象里包含了很多分页信息：

- 总页数、总条数、当前页、每页条数、**数据列表**
- `getRecords()` = **获取分页查询到的「店铺数据列表」**（就是我们要展示给用户的店铺集合）

③ **指定类型 + 5 公里范围内 + 按距离排序** 的店铺

| 参数    | 代码写法                            | 大白话翻译                                  |
| ------- | ----------------------------------- | ------------------------------------------- |
| 第 1 个 | `key`                               | 查**哪种类型**的店铺（比如美食店）          |
| 第 2 个 | `GeoReference.fromCoordinate(x, y)` | 以**用户当前坐标**为**圆心**                |
| 第 3 个 | `new Distance(5000)`                | 以圆心为中心，画 **5000 米（5 公里）** 的圈 |
| 第 4 个 | `includeDistance()`                 | 必须**计算并返回**每个店铺离用户的距离      |
| 第 4 个 | `limit(end)`                        | 最多查 `end` 条数据（分页用）               |

④ Map<String, Distance> distanceMap = new HashMap<>(list.size());

- `distanceMap`：一个**空 Map**
- 作用：**等会儿存 “店铺 ID → 离你多远”**
- 比如：`105 → 1.2km`

⑤ shop.setDistance(distanceMap.get(shop.getId().toString()).getValue());

.getValue() 的作用是从 `Distance` 对象里，**提取出纯数字的距离值**（比如 `1.2`），`Distance` 对象是 Redis 封装的，包含单位、数值等信息，我们只需要数值给前端展示

### 用户签到

#### 1. BitMap的操作命令：

- SETBIT：向指定位置（offset）存入一个0或1
- GETBIT ：获取指定位置（offset）的bit值
- BITCOUNT ：统计BitMap中值为1的bit位的数量
- BITFIELD ：操作（查询、修改、自增）BitMap中bit数组中的指定位置（offset）的值
- BITFIELD_RO ：获取BitMap中bit数组，并以十进制形式返回
- BITOP ：将多个BitMap的结果做位运算（与 、或、异或）
- BITPOS ：查找bit数组中指定范围内第一个0或1出现的位置

#### 2. 实现签到功能

UserServiceImpl

```java
@Override
public Result sign() {
    // 1.获取当前登录用户
    Long userId = UserHolder.getUser().getId();
    // 2.获取日期
    LocalDateTime now = LocalDateTime.now();
    // 3.拼接key
    String keySuffix = now.format(DateTimeFormatter.ofPattern(":yyyyMM"));
    String key = USER_SIGN_KEY + userId + keySuffix;
    // 4.获取今天是本月的第几天
    int dayOfMonth = now.getDayOfMonth();
    // 5.写入Redis SETBIT key offset 1
    stringRedisTemplate.opsForValue().setBit(key, dayOfMonth - 1, true);
    return Result.ok();
}
```

#### 3. 签到统计

UserServiceImpl

```java
@Override
public Result signCount() {
    // 1.获取当前登录用户
    Long userId = UserHolder.getUser().getId();
    // 2.获取日期
    LocalDateTime now = LocalDateTime.now();
    // 3.拼接key
    String keySuffix = now.format(DateTimeFormatter.ofPattern(":yyyyMM"));
    String key = USER_SIGN_KEY + userId + keySuffix;
    // 4.获取今天是本月的第几天
    int dayOfMonth = now.getDayOfMonth();
    // 5.获取本月截止今天为止的所有的签到记录，返回的是一个十进制的数字 BITFIELD sign:5:202203 GET u14 0
    List<Long> result = stringRedisTemplate.opsForValue().bitField(
            key,
            BitFieldSubCommands.create()
                    .get(BitFieldSubCommands.BitFieldType.unsigned(dayOfMonth)).valueAt(0)
    );
    if (result == null || result.isEmpty()) {
        // 没有任何签到结果
        return Result.ok(0);
    }
    Long num = result.get(0);
    if (num == null || num == 0) {
        return Result.ok(0);
    }
    // 6.循环遍历
    int count = 0;
    while (true) {
        // 6.1.让这个数字与1做与运算，得到数字的最后一个bit位  // 判断这个bit位是否为0
        if ((num & 1) == 0) {
            // 如果为0，说明未签到，结束
            break;
        }else {
            // 如果不为0，说明已签到，计数器+1
            count++;
        }
        // 把数字右移一位，抛弃最后一个bit位，继续下一个bit位
        num >>>= 1;
    }
    return Result.ok(count);
}
```

**说明：**

① 第一层判断：`result == null || result.isEmpty()`

`result` 是一个**列表集合**（比如查询数据库返回的 `List<Long>`）

- `result == null`：**列表对象都不存在**（彻底没数据）
- `result.isEmpty()`：**列表存在，但里面空空如也**（一条数据都没有）
- 满足任意一个 → 直接返回 `0`

② 第二层判断：`num == null || num == 0`

- `num == null`：数据库里这个值是**空值**
- `num == 0`：数字本身就是 0
- 满足任意一个 → 直接返回 `0`

③ 举个生活例子

- **快递柜都坏了 / 根本没这个柜** → 没包裹，返回 0
- 快递柜是好的 → 打开柜门
- **柜子里空的 / 包裹是个空盒子** → 还是没东西，返回 0
- 有真实包裹 → 把包裹给你

