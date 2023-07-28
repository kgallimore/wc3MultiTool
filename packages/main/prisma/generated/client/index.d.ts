
/**
 * Client
**/

import * as runtime from './runtime/library';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions

export type PrismaPromise<T> = $Public.PrismaPromise<T>


export type BanListPayload<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> = {
  name: "BanList"
  objects: {}
  scalars: $Extensions.GetResult<{
    id: number
    username: string
    admin: string
    region: string
    reason: string | null
    removal_date: Date | null
    createdAt: Date
    updatedAt: Date
  }, ExtArgs["result"]["banList"]>
  composites: {}
}

/**
 * Model BanList
 * 
 */
export type BanList = runtime.Types.DefaultSelection<BanListPayload>
export type WhiteListPayload<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> = {
  name: "WhiteList"
  objects: {}
  scalars: $Extensions.GetResult<{
    id: number
    username: string
    admin: string
    region: string
    reason: string | null
    removal_date: Date | null
    createdAt: Date
    updatedAt: Date
  }, ExtArgs["result"]["whiteList"]>
  composites: {}
}

/**
 * Model WhiteList
 * 
 */
export type WhiteList = runtime.Types.DefaultSelection<WhiteListPayload>
export type AdminListPayload<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> = {
  name: "AdminList"
  objects: {}
  scalars: $Extensions.GetResult<{
    id: number
    username: string
    admin: string
    region: string
    role: string
    removal_date: Date | null
    createdAt: Date
    updatedAt: Date
  }, ExtArgs["result"]["adminList"]>
  composites: {}
}

/**
 * Model AdminList
 * 
 */
export type AdminList = runtime.Types.DefaultSelection<AdminListPayload>

/**
 * ##  Prisma Client ʲˢ
 * 
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more BanLists
 * const banLists = await prisma.banList.findMany()
 * ```
 *
 * 
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  T extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  U = 'log' extends keyof T ? T['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<T['log']> : never : never,
  ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   * 
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more BanLists
   * const banLists = await prisma.banList.findMany()
   * ```
   *
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<T, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): void;

  /**
   * Connect with the database
   */
  $connect(): Promise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): Promise<void>;

  /**
   * Add a middleware
   * @deprecated since 4.16.0. For new code, prefer client extensions instead.
   * @see https://pris.ly/d/extensions
   */
  $use(cb: Prisma.Middleware): void

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): Promise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => Promise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): Promise<R>


  $extends: $Extensions.ExtendsHook<'extends', Prisma.TypeMapCb, ExtArgs>

      /**
   * `prisma.banList`: Exposes CRUD operations for the **BanList** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more BanLists
    * const banLists = await prisma.banList.findMany()
    * ```
    */
  get banList(): Prisma.BanListDelegate<ExtArgs>;

  /**
   * `prisma.whiteList`: Exposes CRUD operations for the **WhiteList** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more WhiteLists
    * const whiteLists = await prisma.whiteList.findMany()
    * ```
    */
  get whiteList(): Prisma.WhiteListDelegate<ExtArgs>;

  /**
   * `prisma.adminList`: Exposes CRUD operations for the **AdminList** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more AdminLists
    * const adminLists = await prisma.adminList.findMany()
    * ```
    */
  get adminList(): Prisma.AdminListDelegate<ExtArgs>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError
  export import NotFoundError = runtime.NotFoundError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql

  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics 
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export type Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export type Args<T, F extends $Public.Operation> = $Public.Args<T, F>
  export type Payload<T, F extends $Public.Operation> = $Public.Payload<T, F>
  export type Result<T, A, F extends $Public.Operation> = $Public.Result<T, A, F>
  export type Exact<T, W> = $Public.Exact<T, W>

  /**
   * Prisma Client JS version: 5.0.0
   * Query Engine version: 6b0aef69b7cdfc787f822ecd7cdc76d5f1991584
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion 

  /**
   * Utility Types
   */

  /**
   * From https://github.com/sindresorhus/type-fest/
   * Matches a JSON object.
   * This type can be useful to enforce some input to be JSON-compatible or as a super-type to be extended from. 
   */
  export type JsonObject = {[Key in string]?: JsonValue}

  /**
   * From https://github.com/sindresorhus/type-fest/
   * Matches a JSON array.
   */
  export interface JsonArray extends Array<JsonValue> {}

  /**
   * From https://github.com/sindresorhus/type-fest/
   * Matches any valid JSON value.
   */
  export type JsonValue = string | number | boolean | JsonObject | JsonArray | null

  /**
   * Matches a JSON object.
   * Unlike `JsonObject`, this type allows undefined and read-only properties.
   */
  export type InputJsonObject = {readonly [Key in string]?: InputJsonValue | null}

  /**
   * Matches a JSON array.
   * Unlike `JsonArray`, readonly arrays are assignable to this type.
   */
  export interface InputJsonArray extends ReadonlyArray<InputJsonValue | null> {}

  /**
   * Matches any valid value that can be used as an input for operations like
   * create and update as the value of a JSON field. Unlike `JsonValue`, this
   * type allows read-only arrays and read-only object properties and disallows
   * `null` at the top level.
   *
   * `null` cannot be used as the value of a JSON field because its meaning
   * would be ambiguous. Use `Prisma.JsonNull` to store the JSON null value or
   * `Prisma.DbNull` to clear the JSON value and set the field to the database
   * NULL value instead.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-by-null-values
   */
  export type InputJsonValue = string | number | boolean | InputJsonObject | InputJsonArray

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }
  type HasSelect = {
    select: any
  }
  type HasInclude = {
    include: any
  }
  type CheckSelect<T, S, U> = T extends SelectAndInclude
    ? 'Please either choose `select` or `include`'
    : T extends HasSelect
    ? U
    : T extends HasInclude
    ? U
    : S

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => Promise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? K : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    BanList: 'BanList',
    WhiteList: 'WhiteList',
    AdminList: 'AdminList'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }


  interface TypeMapCb extends $Utils.Fn<{extArgs: $Extensions.Args}, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs']>
  }

  export type TypeMap<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> = {
    meta: {
      modelProps: 'banList' | 'whiteList' | 'adminList'
      txIsolationLevel: Prisma.TransactionIsolationLevel
    },
    model: {
      BanList: {
        payload: BanListPayload<ExtArgs>
        fields: Prisma.BanListFieldRefs
        operations: {
          findUnique: {
            args: Prisma.BanListFindUniqueArgs<ExtArgs>,
            result: $Utils.PayloadToResult<BanListPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.BanListFindUniqueOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<BanListPayload>
          }
          findFirst: {
            args: Prisma.BanListFindFirstArgs<ExtArgs>,
            result: $Utils.PayloadToResult<BanListPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.BanListFindFirstOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<BanListPayload>
          }
          findMany: {
            args: Prisma.BanListFindManyArgs<ExtArgs>,
            result: $Utils.PayloadToResult<BanListPayload>[]
          }
          create: {
            args: Prisma.BanListCreateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<BanListPayload>
          }
          delete: {
            args: Prisma.BanListDeleteArgs<ExtArgs>,
            result: $Utils.PayloadToResult<BanListPayload>
          }
          update: {
            args: Prisma.BanListUpdateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<BanListPayload>
          }
          deleteMany: {
            args: Prisma.BanListDeleteManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          updateMany: {
            args: Prisma.BanListUpdateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          upsert: {
            args: Prisma.BanListUpsertArgs<ExtArgs>,
            result: $Utils.PayloadToResult<BanListPayload>
          }
          aggregate: {
            args: Prisma.BanListAggregateArgs<ExtArgs>,
            result: $Utils.Optional<AggregateBanList>
          }
          groupBy: {
            args: Prisma.BanListGroupByArgs<ExtArgs>,
            result: $Utils.Optional<BanListGroupByOutputType>[]
          }
          count: {
            args: Prisma.BanListCountArgs<ExtArgs>,
            result: $Utils.Optional<BanListCountAggregateOutputType> | number
          }
        }
      }
      WhiteList: {
        payload: WhiteListPayload<ExtArgs>
        fields: Prisma.WhiteListFieldRefs
        operations: {
          findUnique: {
            args: Prisma.WhiteListFindUniqueArgs<ExtArgs>,
            result: $Utils.PayloadToResult<WhiteListPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.WhiteListFindUniqueOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<WhiteListPayload>
          }
          findFirst: {
            args: Prisma.WhiteListFindFirstArgs<ExtArgs>,
            result: $Utils.PayloadToResult<WhiteListPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.WhiteListFindFirstOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<WhiteListPayload>
          }
          findMany: {
            args: Prisma.WhiteListFindManyArgs<ExtArgs>,
            result: $Utils.PayloadToResult<WhiteListPayload>[]
          }
          create: {
            args: Prisma.WhiteListCreateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<WhiteListPayload>
          }
          delete: {
            args: Prisma.WhiteListDeleteArgs<ExtArgs>,
            result: $Utils.PayloadToResult<WhiteListPayload>
          }
          update: {
            args: Prisma.WhiteListUpdateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<WhiteListPayload>
          }
          deleteMany: {
            args: Prisma.WhiteListDeleteManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          updateMany: {
            args: Prisma.WhiteListUpdateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          upsert: {
            args: Prisma.WhiteListUpsertArgs<ExtArgs>,
            result: $Utils.PayloadToResult<WhiteListPayload>
          }
          aggregate: {
            args: Prisma.WhiteListAggregateArgs<ExtArgs>,
            result: $Utils.Optional<AggregateWhiteList>
          }
          groupBy: {
            args: Prisma.WhiteListGroupByArgs<ExtArgs>,
            result: $Utils.Optional<WhiteListGroupByOutputType>[]
          }
          count: {
            args: Prisma.WhiteListCountArgs<ExtArgs>,
            result: $Utils.Optional<WhiteListCountAggregateOutputType> | number
          }
        }
      }
      AdminList: {
        payload: AdminListPayload<ExtArgs>
        fields: Prisma.AdminListFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AdminListFindUniqueArgs<ExtArgs>,
            result: $Utils.PayloadToResult<AdminListPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AdminListFindUniqueOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<AdminListPayload>
          }
          findFirst: {
            args: Prisma.AdminListFindFirstArgs<ExtArgs>,
            result: $Utils.PayloadToResult<AdminListPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AdminListFindFirstOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<AdminListPayload>
          }
          findMany: {
            args: Prisma.AdminListFindManyArgs<ExtArgs>,
            result: $Utils.PayloadToResult<AdminListPayload>[]
          }
          create: {
            args: Prisma.AdminListCreateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<AdminListPayload>
          }
          delete: {
            args: Prisma.AdminListDeleteArgs<ExtArgs>,
            result: $Utils.PayloadToResult<AdminListPayload>
          }
          update: {
            args: Prisma.AdminListUpdateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<AdminListPayload>
          }
          deleteMany: {
            args: Prisma.AdminListDeleteManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          updateMany: {
            args: Prisma.AdminListUpdateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          upsert: {
            args: Prisma.AdminListUpsertArgs<ExtArgs>,
            result: $Utils.PayloadToResult<AdminListPayload>
          }
          aggregate: {
            args: Prisma.AdminListAggregateArgs<ExtArgs>,
            result: $Utils.Optional<AggregateAdminList>
          }
          groupBy: {
            args: Prisma.AdminListGroupByArgs<ExtArgs>,
            result: $Utils.Optional<AdminListGroupByOutputType>[]
          }
          count: {
            args: Prisma.AdminListCountArgs<ExtArgs>,
            result: $Utils.Optional<AdminListCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<'define', Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'

  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources

    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat

    /**
     * @example
     * ```
     * // Defaults to stdout
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events
     * log: [
     *  { emit: 'stdout', level: 'query' },
     *  { emit: 'stdout', level: 'info' },
     *  { emit: 'stdout', level: 'warn' }
     *  { emit: 'stdout', level: 'error' }
     * ]
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: Array<LogLevel | LogDefinition>
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type GetLogType<T extends LogLevel | LogDefinition> = T extends LogDefinition ? T['emit'] extends 'event' ? T['level'] : never : never
  export type GetEvents<T extends any> = T extends Array<LogLevel | LogDefinition> ?
    GetLogType<T[0]> | GetLogType<T[1]> | GetLogType<T[2]> | GetLogType<T[3]>
    : never

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findMany'
    | 'findFirst'
    | 'create'
    | 'createMany'
    | 'update'
    | 'updateMany'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'

  /**
   * These options are being passed into the middleware as "params"
   */
  export type MiddlewareParams = {
    model?: ModelName
    action: PrismaAction
    args: any
    dataPath: string[]
    runInTransaction: boolean
  }

  /**
   * The `T` type makes sure, that the `return proceed` is not forgotten in the middleware implementation
   */
  export type Middleware<T = any> = (
    params: MiddlewareParams,
    next: (params: MiddlewareParams) => Promise<T>,
  ) => Promise<T>

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */



  /**
   * Models
   */

  /**
   * Model BanList
   */


  export type AggregateBanList = {
    _count: BanListCountAggregateOutputType | null
    _avg: BanListAvgAggregateOutputType | null
    _sum: BanListSumAggregateOutputType | null
    _min: BanListMinAggregateOutputType | null
    _max: BanListMaxAggregateOutputType | null
  }

  export type BanListAvgAggregateOutputType = {
    id: number | null
  }

  export type BanListSumAggregateOutputType = {
    id: number | null
  }

  export type BanListMinAggregateOutputType = {
    id: number | null
    username: string | null
    admin: string | null
    region: string | null
    reason: string | null
    removal_date: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type BanListMaxAggregateOutputType = {
    id: number | null
    username: string | null
    admin: string | null
    region: string | null
    reason: string | null
    removal_date: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type BanListCountAggregateOutputType = {
    id: number
    username: number
    admin: number
    region: number
    reason: number
    removal_date: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type BanListAvgAggregateInputType = {
    id?: true
  }

  export type BanListSumAggregateInputType = {
    id?: true
  }

  export type BanListMinAggregateInputType = {
    id?: true
    username?: true
    admin?: true
    region?: true
    reason?: true
    removal_date?: true
    createdAt?: true
    updatedAt?: true
  }

  export type BanListMaxAggregateInputType = {
    id?: true
    username?: true
    admin?: true
    region?: true
    reason?: true
    removal_date?: true
    createdAt?: true
    updatedAt?: true
  }

  export type BanListCountAggregateInputType = {
    id?: true
    username?: true
    admin?: true
    region?: true
    reason?: true
    removal_date?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type BanListAggregateArgs<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> = {
    /**
     * Filter which BanList to aggregate.
     */
    where?: BanListWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of BanLists to fetch.
     */
    orderBy?: BanListOrderByWithRelationInput | BanListOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: BanListWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` BanLists from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` BanLists.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned BanLists
    **/
    _count?: true | BanListCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: BanListAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: BanListSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: BanListMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: BanListMaxAggregateInputType
  }

  export type GetBanListAggregateType<T extends BanListAggregateArgs> = {
        [P in keyof T & keyof AggregateBanList]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateBanList[P]>
      : GetScalarType<T[P], AggregateBanList[P]>
  }




  export type BanListGroupByArgs<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> = {
    where?: BanListWhereInput
    orderBy?: BanListOrderByWithAggregationInput | BanListOrderByWithAggregationInput[]
    by: BanListScalarFieldEnum[] | BanListScalarFieldEnum
    having?: BanListScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: BanListCountAggregateInputType | true
    _avg?: BanListAvgAggregateInputType
    _sum?: BanListSumAggregateInputType
    _min?: BanListMinAggregateInputType
    _max?: BanListMaxAggregateInputType
  }


  export type BanListGroupByOutputType = {
    id: number
    username: string
    admin: string
    region: string
    reason: string | null
    removal_date: Date | null
    createdAt: Date
    updatedAt: Date
    _count: BanListCountAggregateOutputType | null
    _avg: BanListAvgAggregateOutputType | null
    _sum: BanListSumAggregateOutputType | null
    _min: BanListMinAggregateOutputType | null
    _max: BanListMaxAggregateOutputType | null
  }

  type GetBanListGroupByPayload<T extends BanListGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<BanListGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof BanListGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], BanListGroupByOutputType[P]>
            : GetScalarType<T[P], BanListGroupByOutputType[P]>
        }
      >
    >


  export type BanListSelect<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    username?: boolean
    admin?: boolean
    region?: boolean
    reason?: boolean
    removal_date?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["banList"]>

  export type BanListSelectScalar = {
    id?: boolean
    username?: boolean
    admin?: boolean
    region?: boolean
    reason?: boolean
    removal_date?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }


  type BanListGetPayload<S extends boolean | null | undefined | BanListArgs> = $Types.GetResult<BanListPayload, S>

  type BanListCountArgs<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> = 
    Omit<BanListFindManyArgs, 'select' | 'include'> & {
      select?: BanListCountAggregateInputType | true
    }

  export interface BanListDelegate<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['BanList'], meta: { name: 'BanList' } }
    /**
     * Find zero or one BanList that matches the filter.
     * @param {BanListFindUniqueArgs} args - Arguments to find a BanList
     * @example
     * // Get one BanList
     * const banList = await prisma.banList.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUnique<T extends BanListFindUniqueArgs<ExtArgs>>(
      args: SelectSubset<T, BanListFindUniqueArgs<ExtArgs>>
    ): Prisma__BanListClient<$Types.GetResult<BanListPayload<ExtArgs>, T, 'findUnique'> | null, null, ExtArgs>

    /**
     * Find one BanList that matches the filter or throw an error  with `error.code='P2025'` 
     *     if no matches were found.
     * @param {BanListFindUniqueOrThrowArgs} args - Arguments to find a BanList
     * @example
     * // Get one BanList
     * const banList = await prisma.banList.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUniqueOrThrow<T extends BanListFindUniqueOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, BanListFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__BanListClient<$Types.GetResult<BanListPayload<ExtArgs>, T, 'findUniqueOrThrow'>, never, ExtArgs>

    /**
     * Find the first BanList that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BanListFindFirstArgs} args - Arguments to find a BanList
     * @example
     * // Get one BanList
     * const banList = await prisma.banList.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirst<T extends BanListFindFirstArgs<ExtArgs>>(
      args?: SelectSubset<T, BanListFindFirstArgs<ExtArgs>>
    ): Prisma__BanListClient<$Types.GetResult<BanListPayload<ExtArgs>, T, 'findFirst'> | null, null, ExtArgs>

    /**
     * Find the first BanList that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BanListFindFirstOrThrowArgs} args - Arguments to find a BanList
     * @example
     * // Get one BanList
     * const banList = await prisma.banList.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirstOrThrow<T extends BanListFindFirstOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, BanListFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__BanListClient<$Types.GetResult<BanListPayload<ExtArgs>, T, 'findFirstOrThrow'>, never, ExtArgs>

    /**
     * Find zero or more BanLists that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BanListFindManyArgs=} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all BanLists
     * const banLists = await prisma.banList.findMany()
     * 
     * // Get first 10 BanLists
     * const banLists = await prisma.banList.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const banListWithIdOnly = await prisma.banList.findMany({ select: { id: true } })
     * 
    **/
    findMany<T extends BanListFindManyArgs<ExtArgs>>(
      args?: SelectSubset<T, BanListFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Types.GetResult<BanListPayload<ExtArgs>, T, 'findMany'>>

    /**
     * Create a BanList.
     * @param {BanListCreateArgs} args - Arguments to create a BanList.
     * @example
     * // Create one BanList
     * const BanList = await prisma.banList.create({
     *   data: {
     *     // ... data to create a BanList
     *   }
     * })
     * 
    **/
    create<T extends BanListCreateArgs<ExtArgs>>(
      args: SelectSubset<T, BanListCreateArgs<ExtArgs>>
    ): Prisma__BanListClient<$Types.GetResult<BanListPayload<ExtArgs>, T, 'create'>, never, ExtArgs>

    /**
     * Delete a BanList.
     * @param {BanListDeleteArgs} args - Arguments to delete one BanList.
     * @example
     * // Delete one BanList
     * const BanList = await prisma.banList.delete({
     *   where: {
     *     // ... filter to delete one BanList
     *   }
     * })
     * 
    **/
    delete<T extends BanListDeleteArgs<ExtArgs>>(
      args: SelectSubset<T, BanListDeleteArgs<ExtArgs>>
    ): Prisma__BanListClient<$Types.GetResult<BanListPayload<ExtArgs>, T, 'delete'>, never, ExtArgs>

    /**
     * Update one BanList.
     * @param {BanListUpdateArgs} args - Arguments to update one BanList.
     * @example
     * // Update one BanList
     * const banList = await prisma.banList.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    update<T extends BanListUpdateArgs<ExtArgs>>(
      args: SelectSubset<T, BanListUpdateArgs<ExtArgs>>
    ): Prisma__BanListClient<$Types.GetResult<BanListPayload<ExtArgs>, T, 'update'>, never, ExtArgs>

    /**
     * Delete zero or more BanLists.
     * @param {BanListDeleteManyArgs} args - Arguments to filter BanLists to delete.
     * @example
     * // Delete a few BanLists
     * const { count } = await prisma.banList.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
    **/
    deleteMany<T extends BanListDeleteManyArgs<ExtArgs>>(
      args?: SelectSubset<T, BanListDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more BanLists.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BanListUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many BanLists
     * const banList = await prisma.banList.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    updateMany<T extends BanListUpdateManyArgs<ExtArgs>>(
      args: SelectSubset<T, BanListUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one BanList.
     * @param {BanListUpsertArgs} args - Arguments to update or create a BanList.
     * @example
     * // Update or create a BanList
     * const banList = await prisma.banList.upsert({
     *   create: {
     *     // ... data to create a BanList
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the BanList we want to update
     *   }
     * })
    **/
    upsert<T extends BanListUpsertArgs<ExtArgs>>(
      args: SelectSubset<T, BanListUpsertArgs<ExtArgs>>
    ): Prisma__BanListClient<$Types.GetResult<BanListPayload<ExtArgs>, T, 'upsert'>, never, ExtArgs>

    /**
     * Count the number of BanLists.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BanListCountArgs} args - Arguments to filter BanLists to count.
     * @example
     * // Count the number of BanLists
     * const count = await prisma.banList.count({
     *   where: {
     *     // ... the filter for the BanLists we want to count
     *   }
     * })
    **/
    count<T extends BanListCountArgs>(
      args?: Subset<T, BanListCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], BanListCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a BanList.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BanListAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends BanListAggregateArgs>(args: Subset<T, BanListAggregateArgs>): Prisma.PrismaPromise<GetBanListAggregateType<T>>

    /**
     * Group by BanList.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BanListGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends BanListGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: BanListGroupByArgs['orderBy'] }
        : { orderBy?: BanListGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, BanListGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetBanListGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the BanList model
   */
  readonly fields: BanListFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for BanList.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export class Prisma__BanListClient<T, Null = never, ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> implements Prisma.PrismaPromise<T> {
    private readonly _dmmf;
    private readonly _queryType;
    private readonly _rootField;
    private readonly _clientMethod;
    private readonly _args;
    private readonly _dataPath;
    private readonly _errorFormat;
    private readonly _measurePerformance?;
    private _isList;
    private _callsite;
    private _requestPromise?;
    readonly [Symbol.toStringTag]: 'PrismaPromise';
    constructor(_dmmf: runtime.DMMFClass, _queryType: 'query' | 'mutation', _rootField: string, _clientMethod: string, _args: any, _dataPath: string[], _errorFormat: ErrorFormat, _measurePerformance?: boolean | undefined, _isList?: boolean);


    private get _document();
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): Promise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): Promise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): Promise<T>;
  }



  /**
   * Fields of the BanList model
   */ 
  interface BanListFieldRefs {
    readonly id: FieldRef<"BanList", 'Int'>
    readonly username: FieldRef<"BanList", 'String'>
    readonly admin: FieldRef<"BanList", 'String'>
    readonly region: FieldRef<"BanList", 'String'>
    readonly reason: FieldRef<"BanList", 'String'>
    readonly removal_date: FieldRef<"BanList", 'DateTime'>
    readonly createdAt: FieldRef<"BanList", 'DateTime'>
    readonly updatedAt: FieldRef<"BanList", 'DateTime'>
  }
    

  // Custom InputTypes

  /**
   * BanList findUnique
   */
  export type BanListFindUniqueArgs<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BanList
     */
    select?: BanListSelect<ExtArgs> | null
    /**
     * Filter, which BanList to fetch.
     */
    where: BanListWhereUniqueInput
  }


  /**
   * BanList findUniqueOrThrow
   */
  export type BanListFindUniqueOrThrowArgs<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BanList
     */
    select?: BanListSelect<ExtArgs> | null
    /**
     * Filter, which BanList to fetch.
     */
    where: BanListWhereUniqueInput
  }


  /**
   * BanList findFirst
   */
  export type BanListFindFirstArgs<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BanList
     */
    select?: BanListSelect<ExtArgs> | null
    /**
     * Filter, which BanList to fetch.
     */
    where?: BanListWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of BanLists to fetch.
     */
    orderBy?: BanListOrderByWithRelationInput | BanListOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for BanLists.
     */
    cursor?: BanListWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` BanLists from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` BanLists.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of BanLists.
     */
    distinct?: BanListScalarFieldEnum | BanListScalarFieldEnum[]
  }


  /**
   * BanList findFirstOrThrow
   */
  export type BanListFindFirstOrThrowArgs<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BanList
     */
    select?: BanListSelect<ExtArgs> | null
    /**
     * Filter, which BanList to fetch.
     */
    where?: BanListWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of BanLists to fetch.
     */
    orderBy?: BanListOrderByWithRelationInput | BanListOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for BanLists.
     */
    cursor?: BanListWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` BanLists from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` BanLists.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of BanLists.
     */
    distinct?: BanListScalarFieldEnum | BanListScalarFieldEnum[]
  }


  /**
   * BanList findMany
   */
  export type BanListFindManyArgs<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BanList
     */
    select?: BanListSelect<ExtArgs> | null
    /**
     * Filter, which BanLists to fetch.
     */
    where?: BanListWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of BanLists to fetch.
     */
    orderBy?: BanListOrderByWithRelationInput | BanListOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing BanLists.
     */
    cursor?: BanListWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` BanLists from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` BanLists.
     */
    skip?: number
    distinct?: BanListScalarFieldEnum | BanListScalarFieldEnum[]
  }


  /**
   * BanList create
   */
  export type BanListCreateArgs<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BanList
     */
    select?: BanListSelect<ExtArgs> | null
    /**
     * The data needed to create a BanList.
     */
    data: XOR<BanListCreateInput, BanListUncheckedCreateInput>
  }


  /**
   * BanList update
   */
  export type BanListUpdateArgs<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BanList
     */
    select?: BanListSelect<ExtArgs> | null
    /**
     * The data needed to update a BanList.
     */
    data: XOR<BanListUpdateInput, BanListUncheckedUpdateInput>
    /**
     * Choose, which BanList to update.
     */
    where: BanListWhereUniqueInput
  }


  /**
   * BanList updateMany
   */
  export type BanListUpdateManyArgs<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> = {
    /**
     * The data used to update BanLists.
     */
    data: XOR<BanListUpdateManyMutationInput, BanListUncheckedUpdateManyInput>
    /**
     * Filter which BanLists to update
     */
    where?: BanListWhereInput
  }


  /**
   * BanList upsert
   */
  export type BanListUpsertArgs<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BanList
     */
    select?: BanListSelect<ExtArgs> | null
    /**
     * The filter to search for the BanList to update in case it exists.
     */
    where: BanListWhereUniqueInput
    /**
     * In case the BanList found by the `where` argument doesn't exist, create a new BanList with this data.
     */
    create: XOR<BanListCreateInput, BanListUncheckedCreateInput>
    /**
     * In case the BanList was found with the provided `where` argument, update it with this data.
     */
    update: XOR<BanListUpdateInput, BanListUncheckedUpdateInput>
  }


  /**
   * BanList delete
   */
  export type BanListDeleteArgs<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BanList
     */
    select?: BanListSelect<ExtArgs> | null
    /**
     * Filter which BanList to delete.
     */
    where: BanListWhereUniqueInput
  }


  /**
   * BanList deleteMany
   */
  export type BanListDeleteManyArgs<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> = {
    /**
     * Filter which BanLists to delete
     */
    where?: BanListWhereInput
  }


  /**
   * BanList without action
   */
  export type BanListArgs<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BanList
     */
    select?: BanListSelect<ExtArgs> | null
  }



  /**
   * Model WhiteList
   */


  export type AggregateWhiteList = {
    _count: WhiteListCountAggregateOutputType | null
    _avg: WhiteListAvgAggregateOutputType | null
    _sum: WhiteListSumAggregateOutputType | null
    _min: WhiteListMinAggregateOutputType | null
    _max: WhiteListMaxAggregateOutputType | null
  }

  export type WhiteListAvgAggregateOutputType = {
    id: number | null
  }

  export type WhiteListSumAggregateOutputType = {
    id: number | null
  }

  export type WhiteListMinAggregateOutputType = {
    id: number | null
    username: string | null
    admin: string | null
    region: string | null
    reason: string | null
    removal_date: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type WhiteListMaxAggregateOutputType = {
    id: number | null
    username: string | null
    admin: string | null
    region: string | null
    reason: string | null
    removal_date: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type WhiteListCountAggregateOutputType = {
    id: number
    username: number
    admin: number
    region: number
    reason: number
    removal_date: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type WhiteListAvgAggregateInputType = {
    id?: true
  }

  export type WhiteListSumAggregateInputType = {
    id?: true
  }

  export type WhiteListMinAggregateInputType = {
    id?: true
    username?: true
    admin?: true
    region?: true
    reason?: true
    removal_date?: true
    createdAt?: true
    updatedAt?: true
  }

  export type WhiteListMaxAggregateInputType = {
    id?: true
    username?: true
    admin?: true
    region?: true
    reason?: true
    removal_date?: true
    createdAt?: true
    updatedAt?: true
  }

  export type WhiteListCountAggregateInputType = {
    id?: true
    username?: true
    admin?: true
    region?: true
    reason?: true
    removal_date?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type WhiteListAggregateArgs<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> = {
    /**
     * Filter which WhiteList to aggregate.
     */
    where?: WhiteListWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of WhiteLists to fetch.
     */
    orderBy?: WhiteListOrderByWithRelationInput | WhiteListOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: WhiteListWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` WhiteLists from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` WhiteLists.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned WhiteLists
    **/
    _count?: true | WhiteListCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: WhiteListAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: WhiteListSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: WhiteListMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: WhiteListMaxAggregateInputType
  }

  export type GetWhiteListAggregateType<T extends WhiteListAggregateArgs> = {
        [P in keyof T & keyof AggregateWhiteList]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateWhiteList[P]>
      : GetScalarType<T[P], AggregateWhiteList[P]>
  }




  export type WhiteListGroupByArgs<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> = {
    where?: WhiteListWhereInput
    orderBy?: WhiteListOrderByWithAggregationInput | WhiteListOrderByWithAggregationInput[]
    by: WhiteListScalarFieldEnum[] | WhiteListScalarFieldEnum
    having?: WhiteListScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: WhiteListCountAggregateInputType | true
    _avg?: WhiteListAvgAggregateInputType
    _sum?: WhiteListSumAggregateInputType
    _min?: WhiteListMinAggregateInputType
    _max?: WhiteListMaxAggregateInputType
  }


  export type WhiteListGroupByOutputType = {
    id: number
    username: string
    admin: string
    region: string
    reason: string | null
    removal_date: Date | null
    createdAt: Date
    updatedAt: Date
    _count: WhiteListCountAggregateOutputType | null
    _avg: WhiteListAvgAggregateOutputType | null
    _sum: WhiteListSumAggregateOutputType | null
    _min: WhiteListMinAggregateOutputType | null
    _max: WhiteListMaxAggregateOutputType | null
  }

  type GetWhiteListGroupByPayload<T extends WhiteListGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<WhiteListGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof WhiteListGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], WhiteListGroupByOutputType[P]>
            : GetScalarType<T[P], WhiteListGroupByOutputType[P]>
        }
      >
    >


  export type WhiteListSelect<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    username?: boolean
    admin?: boolean
    region?: boolean
    reason?: boolean
    removal_date?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["whiteList"]>

  export type WhiteListSelectScalar = {
    id?: boolean
    username?: boolean
    admin?: boolean
    region?: boolean
    reason?: boolean
    removal_date?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }


  type WhiteListGetPayload<S extends boolean | null | undefined | WhiteListArgs> = $Types.GetResult<WhiteListPayload, S>

  type WhiteListCountArgs<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> = 
    Omit<WhiteListFindManyArgs, 'select' | 'include'> & {
      select?: WhiteListCountAggregateInputType | true
    }

  export interface WhiteListDelegate<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['WhiteList'], meta: { name: 'WhiteList' } }
    /**
     * Find zero or one WhiteList that matches the filter.
     * @param {WhiteListFindUniqueArgs} args - Arguments to find a WhiteList
     * @example
     * // Get one WhiteList
     * const whiteList = await prisma.whiteList.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUnique<T extends WhiteListFindUniqueArgs<ExtArgs>>(
      args: SelectSubset<T, WhiteListFindUniqueArgs<ExtArgs>>
    ): Prisma__WhiteListClient<$Types.GetResult<WhiteListPayload<ExtArgs>, T, 'findUnique'> | null, null, ExtArgs>

    /**
     * Find one WhiteList that matches the filter or throw an error  with `error.code='P2025'` 
     *     if no matches were found.
     * @param {WhiteListFindUniqueOrThrowArgs} args - Arguments to find a WhiteList
     * @example
     * // Get one WhiteList
     * const whiteList = await prisma.whiteList.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUniqueOrThrow<T extends WhiteListFindUniqueOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, WhiteListFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__WhiteListClient<$Types.GetResult<WhiteListPayload<ExtArgs>, T, 'findUniqueOrThrow'>, never, ExtArgs>

    /**
     * Find the first WhiteList that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WhiteListFindFirstArgs} args - Arguments to find a WhiteList
     * @example
     * // Get one WhiteList
     * const whiteList = await prisma.whiteList.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirst<T extends WhiteListFindFirstArgs<ExtArgs>>(
      args?: SelectSubset<T, WhiteListFindFirstArgs<ExtArgs>>
    ): Prisma__WhiteListClient<$Types.GetResult<WhiteListPayload<ExtArgs>, T, 'findFirst'> | null, null, ExtArgs>

    /**
     * Find the first WhiteList that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WhiteListFindFirstOrThrowArgs} args - Arguments to find a WhiteList
     * @example
     * // Get one WhiteList
     * const whiteList = await prisma.whiteList.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirstOrThrow<T extends WhiteListFindFirstOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, WhiteListFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__WhiteListClient<$Types.GetResult<WhiteListPayload<ExtArgs>, T, 'findFirstOrThrow'>, never, ExtArgs>

    /**
     * Find zero or more WhiteLists that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WhiteListFindManyArgs=} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all WhiteLists
     * const whiteLists = await prisma.whiteList.findMany()
     * 
     * // Get first 10 WhiteLists
     * const whiteLists = await prisma.whiteList.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const whiteListWithIdOnly = await prisma.whiteList.findMany({ select: { id: true } })
     * 
    **/
    findMany<T extends WhiteListFindManyArgs<ExtArgs>>(
      args?: SelectSubset<T, WhiteListFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Types.GetResult<WhiteListPayload<ExtArgs>, T, 'findMany'>>

    /**
     * Create a WhiteList.
     * @param {WhiteListCreateArgs} args - Arguments to create a WhiteList.
     * @example
     * // Create one WhiteList
     * const WhiteList = await prisma.whiteList.create({
     *   data: {
     *     // ... data to create a WhiteList
     *   }
     * })
     * 
    **/
    create<T extends WhiteListCreateArgs<ExtArgs>>(
      args: SelectSubset<T, WhiteListCreateArgs<ExtArgs>>
    ): Prisma__WhiteListClient<$Types.GetResult<WhiteListPayload<ExtArgs>, T, 'create'>, never, ExtArgs>

    /**
     * Delete a WhiteList.
     * @param {WhiteListDeleteArgs} args - Arguments to delete one WhiteList.
     * @example
     * // Delete one WhiteList
     * const WhiteList = await prisma.whiteList.delete({
     *   where: {
     *     // ... filter to delete one WhiteList
     *   }
     * })
     * 
    **/
    delete<T extends WhiteListDeleteArgs<ExtArgs>>(
      args: SelectSubset<T, WhiteListDeleteArgs<ExtArgs>>
    ): Prisma__WhiteListClient<$Types.GetResult<WhiteListPayload<ExtArgs>, T, 'delete'>, never, ExtArgs>

    /**
     * Update one WhiteList.
     * @param {WhiteListUpdateArgs} args - Arguments to update one WhiteList.
     * @example
     * // Update one WhiteList
     * const whiteList = await prisma.whiteList.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    update<T extends WhiteListUpdateArgs<ExtArgs>>(
      args: SelectSubset<T, WhiteListUpdateArgs<ExtArgs>>
    ): Prisma__WhiteListClient<$Types.GetResult<WhiteListPayload<ExtArgs>, T, 'update'>, never, ExtArgs>

    /**
     * Delete zero or more WhiteLists.
     * @param {WhiteListDeleteManyArgs} args - Arguments to filter WhiteLists to delete.
     * @example
     * // Delete a few WhiteLists
     * const { count } = await prisma.whiteList.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
    **/
    deleteMany<T extends WhiteListDeleteManyArgs<ExtArgs>>(
      args?: SelectSubset<T, WhiteListDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more WhiteLists.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WhiteListUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many WhiteLists
     * const whiteList = await prisma.whiteList.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    updateMany<T extends WhiteListUpdateManyArgs<ExtArgs>>(
      args: SelectSubset<T, WhiteListUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one WhiteList.
     * @param {WhiteListUpsertArgs} args - Arguments to update or create a WhiteList.
     * @example
     * // Update or create a WhiteList
     * const whiteList = await prisma.whiteList.upsert({
     *   create: {
     *     // ... data to create a WhiteList
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the WhiteList we want to update
     *   }
     * })
    **/
    upsert<T extends WhiteListUpsertArgs<ExtArgs>>(
      args: SelectSubset<T, WhiteListUpsertArgs<ExtArgs>>
    ): Prisma__WhiteListClient<$Types.GetResult<WhiteListPayload<ExtArgs>, T, 'upsert'>, never, ExtArgs>

    /**
     * Count the number of WhiteLists.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WhiteListCountArgs} args - Arguments to filter WhiteLists to count.
     * @example
     * // Count the number of WhiteLists
     * const count = await prisma.whiteList.count({
     *   where: {
     *     // ... the filter for the WhiteLists we want to count
     *   }
     * })
    **/
    count<T extends WhiteListCountArgs>(
      args?: Subset<T, WhiteListCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], WhiteListCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a WhiteList.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WhiteListAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends WhiteListAggregateArgs>(args: Subset<T, WhiteListAggregateArgs>): Prisma.PrismaPromise<GetWhiteListAggregateType<T>>

    /**
     * Group by WhiteList.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WhiteListGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends WhiteListGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: WhiteListGroupByArgs['orderBy'] }
        : { orderBy?: WhiteListGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, WhiteListGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetWhiteListGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the WhiteList model
   */
  readonly fields: WhiteListFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for WhiteList.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export class Prisma__WhiteListClient<T, Null = never, ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> implements Prisma.PrismaPromise<T> {
    private readonly _dmmf;
    private readonly _queryType;
    private readonly _rootField;
    private readonly _clientMethod;
    private readonly _args;
    private readonly _dataPath;
    private readonly _errorFormat;
    private readonly _measurePerformance?;
    private _isList;
    private _callsite;
    private _requestPromise?;
    readonly [Symbol.toStringTag]: 'PrismaPromise';
    constructor(_dmmf: runtime.DMMFClass, _queryType: 'query' | 'mutation', _rootField: string, _clientMethod: string, _args: any, _dataPath: string[], _errorFormat: ErrorFormat, _measurePerformance?: boolean | undefined, _isList?: boolean);


    private get _document();
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): Promise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): Promise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): Promise<T>;
  }



  /**
   * Fields of the WhiteList model
   */ 
  interface WhiteListFieldRefs {
    readonly id: FieldRef<"WhiteList", 'Int'>
    readonly username: FieldRef<"WhiteList", 'String'>
    readonly admin: FieldRef<"WhiteList", 'String'>
    readonly region: FieldRef<"WhiteList", 'String'>
    readonly reason: FieldRef<"WhiteList", 'String'>
    readonly removal_date: FieldRef<"WhiteList", 'DateTime'>
    readonly createdAt: FieldRef<"WhiteList", 'DateTime'>
    readonly updatedAt: FieldRef<"WhiteList", 'DateTime'>
  }
    

  // Custom InputTypes

  /**
   * WhiteList findUnique
   */
  export type WhiteListFindUniqueArgs<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WhiteList
     */
    select?: WhiteListSelect<ExtArgs> | null
    /**
     * Filter, which WhiteList to fetch.
     */
    where: WhiteListWhereUniqueInput
  }


  /**
   * WhiteList findUniqueOrThrow
   */
  export type WhiteListFindUniqueOrThrowArgs<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WhiteList
     */
    select?: WhiteListSelect<ExtArgs> | null
    /**
     * Filter, which WhiteList to fetch.
     */
    where: WhiteListWhereUniqueInput
  }


  /**
   * WhiteList findFirst
   */
  export type WhiteListFindFirstArgs<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WhiteList
     */
    select?: WhiteListSelect<ExtArgs> | null
    /**
     * Filter, which WhiteList to fetch.
     */
    where?: WhiteListWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of WhiteLists to fetch.
     */
    orderBy?: WhiteListOrderByWithRelationInput | WhiteListOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for WhiteLists.
     */
    cursor?: WhiteListWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` WhiteLists from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` WhiteLists.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of WhiteLists.
     */
    distinct?: WhiteListScalarFieldEnum | WhiteListScalarFieldEnum[]
  }


  /**
   * WhiteList findFirstOrThrow
   */
  export type WhiteListFindFirstOrThrowArgs<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WhiteList
     */
    select?: WhiteListSelect<ExtArgs> | null
    /**
     * Filter, which WhiteList to fetch.
     */
    where?: WhiteListWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of WhiteLists to fetch.
     */
    orderBy?: WhiteListOrderByWithRelationInput | WhiteListOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for WhiteLists.
     */
    cursor?: WhiteListWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` WhiteLists from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` WhiteLists.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of WhiteLists.
     */
    distinct?: WhiteListScalarFieldEnum | WhiteListScalarFieldEnum[]
  }


  /**
   * WhiteList findMany
   */
  export type WhiteListFindManyArgs<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WhiteList
     */
    select?: WhiteListSelect<ExtArgs> | null
    /**
     * Filter, which WhiteLists to fetch.
     */
    where?: WhiteListWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of WhiteLists to fetch.
     */
    orderBy?: WhiteListOrderByWithRelationInput | WhiteListOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing WhiteLists.
     */
    cursor?: WhiteListWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` WhiteLists from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` WhiteLists.
     */
    skip?: number
    distinct?: WhiteListScalarFieldEnum | WhiteListScalarFieldEnum[]
  }


  /**
   * WhiteList create
   */
  export type WhiteListCreateArgs<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WhiteList
     */
    select?: WhiteListSelect<ExtArgs> | null
    /**
     * The data needed to create a WhiteList.
     */
    data: XOR<WhiteListCreateInput, WhiteListUncheckedCreateInput>
  }


  /**
   * WhiteList update
   */
  export type WhiteListUpdateArgs<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WhiteList
     */
    select?: WhiteListSelect<ExtArgs> | null
    /**
     * The data needed to update a WhiteList.
     */
    data: XOR<WhiteListUpdateInput, WhiteListUncheckedUpdateInput>
    /**
     * Choose, which WhiteList to update.
     */
    where: WhiteListWhereUniqueInput
  }


  /**
   * WhiteList updateMany
   */
  export type WhiteListUpdateManyArgs<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> = {
    /**
     * The data used to update WhiteLists.
     */
    data: XOR<WhiteListUpdateManyMutationInput, WhiteListUncheckedUpdateManyInput>
    /**
     * Filter which WhiteLists to update
     */
    where?: WhiteListWhereInput
  }


  /**
   * WhiteList upsert
   */
  export type WhiteListUpsertArgs<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WhiteList
     */
    select?: WhiteListSelect<ExtArgs> | null
    /**
     * The filter to search for the WhiteList to update in case it exists.
     */
    where: WhiteListWhereUniqueInput
    /**
     * In case the WhiteList found by the `where` argument doesn't exist, create a new WhiteList with this data.
     */
    create: XOR<WhiteListCreateInput, WhiteListUncheckedCreateInput>
    /**
     * In case the WhiteList was found with the provided `where` argument, update it with this data.
     */
    update: XOR<WhiteListUpdateInput, WhiteListUncheckedUpdateInput>
  }


  /**
   * WhiteList delete
   */
  export type WhiteListDeleteArgs<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WhiteList
     */
    select?: WhiteListSelect<ExtArgs> | null
    /**
     * Filter which WhiteList to delete.
     */
    where: WhiteListWhereUniqueInput
  }


  /**
   * WhiteList deleteMany
   */
  export type WhiteListDeleteManyArgs<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> = {
    /**
     * Filter which WhiteLists to delete
     */
    where?: WhiteListWhereInput
  }


  /**
   * WhiteList without action
   */
  export type WhiteListArgs<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WhiteList
     */
    select?: WhiteListSelect<ExtArgs> | null
  }



  /**
   * Model AdminList
   */


  export type AggregateAdminList = {
    _count: AdminListCountAggregateOutputType | null
    _avg: AdminListAvgAggregateOutputType | null
    _sum: AdminListSumAggregateOutputType | null
    _min: AdminListMinAggregateOutputType | null
    _max: AdminListMaxAggregateOutputType | null
  }

  export type AdminListAvgAggregateOutputType = {
    id: number | null
  }

  export type AdminListSumAggregateOutputType = {
    id: number | null
  }

  export type AdminListMinAggregateOutputType = {
    id: number | null
    username: string | null
    admin: string | null
    region: string | null
    role: string | null
    removal_date: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type AdminListMaxAggregateOutputType = {
    id: number | null
    username: string | null
    admin: string | null
    region: string | null
    role: string | null
    removal_date: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type AdminListCountAggregateOutputType = {
    id: number
    username: number
    admin: number
    region: number
    role: number
    removal_date: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type AdminListAvgAggregateInputType = {
    id?: true
  }

  export type AdminListSumAggregateInputType = {
    id?: true
  }

  export type AdminListMinAggregateInputType = {
    id?: true
    username?: true
    admin?: true
    region?: true
    role?: true
    removal_date?: true
    createdAt?: true
    updatedAt?: true
  }

  export type AdminListMaxAggregateInputType = {
    id?: true
    username?: true
    admin?: true
    region?: true
    role?: true
    removal_date?: true
    createdAt?: true
    updatedAt?: true
  }

  export type AdminListCountAggregateInputType = {
    id?: true
    username?: true
    admin?: true
    region?: true
    role?: true
    removal_date?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type AdminListAggregateArgs<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> = {
    /**
     * Filter which AdminList to aggregate.
     */
    where?: AdminListWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AdminLists to fetch.
     */
    orderBy?: AdminListOrderByWithRelationInput | AdminListOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AdminListWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AdminLists from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AdminLists.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned AdminLists
    **/
    _count?: true | AdminListCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: AdminListAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: AdminListSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AdminListMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AdminListMaxAggregateInputType
  }

  export type GetAdminListAggregateType<T extends AdminListAggregateArgs> = {
        [P in keyof T & keyof AggregateAdminList]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAdminList[P]>
      : GetScalarType<T[P], AggregateAdminList[P]>
  }




  export type AdminListGroupByArgs<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> = {
    where?: AdminListWhereInput
    orderBy?: AdminListOrderByWithAggregationInput | AdminListOrderByWithAggregationInput[]
    by: AdminListScalarFieldEnum[] | AdminListScalarFieldEnum
    having?: AdminListScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AdminListCountAggregateInputType | true
    _avg?: AdminListAvgAggregateInputType
    _sum?: AdminListSumAggregateInputType
    _min?: AdminListMinAggregateInputType
    _max?: AdminListMaxAggregateInputType
  }


  export type AdminListGroupByOutputType = {
    id: number
    username: string
    admin: string
    region: string
    role: string
    removal_date: Date | null
    createdAt: Date
    updatedAt: Date
    _count: AdminListCountAggregateOutputType | null
    _avg: AdminListAvgAggregateOutputType | null
    _sum: AdminListSumAggregateOutputType | null
    _min: AdminListMinAggregateOutputType | null
    _max: AdminListMaxAggregateOutputType | null
  }

  type GetAdminListGroupByPayload<T extends AdminListGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AdminListGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AdminListGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AdminListGroupByOutputType[P]>
            : GetScalarType<T[P], AdminListGroupByOutputType[P]>
        }
      >
    >


  export type AdminListSelect<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    username?: boolean
    admin?: boolean
    region?: boolean
    role?: boolean
    removal_date?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["adminList"]>

  export type AdminListSelectScalar = {
    id?: boolean
    username?: boolean
    admin?: boolean
    region?: boolean
    role?: boolean
    removal_date?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }


  type AdminListGetPayload<S extends boolean | null | undefined | AdminListArgs> = $Types.GetResult<AdminListPayload, S>

  type AdminListCountArgs<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> = 
    Omit<AdminListFindManyArgs, 'select' | 'include'> & {
      select?: AdminListCountAggregateInputType | true
    }

  export interface AdminListDelegate<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['AdminList'], meta: { name: 'AdminList' } }
    /**
     * Find zero or one AdminList that matches the filter.
     * @param {AdminListFindUniqueArgs} args - Arguments to find a AdminList
     * @example
     * // Get one AdminList
     * const adminList = await prisma.adminList.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUnique<T extends AdminListFindUniqueArgs<ExtArgs>>(
      args: SelectSubset<T, AdminListFindUniqueArgs<ExtArgs>>
    ): Prisma__AdminListClient<$Types.GetResult<AdminListPayload<ExtArgs>, T, 'findUnique'> | null, null, ExtArgs>

    /**
     * Find one AdminList that matches the filter or throw an error  with `error.code='P2025'` 
     *     if no matches were found.
     * @param {AdminListFindUniqueOrThrowArgs} args - Arguments to find a AdminList
     * @example
     * // Get one AdminList
     * const adminList = await prisma.adminList.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUniqueOrThrow<T extends AdminListFindUniqueOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, AdminListFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__AdminListClient<$Types.GetResult<AdminListPayload<ExtArgs>, T, 'findUniqueOrThrow'>, never, ExtArgs>

    /**
     * Find the first AdminList that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AdminListFindFirstArgs} args - Arguments to find a AdminList
     * @example
     * // Get one AdminList
     * const adminList = await prisma.adminList.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirst<T extends AdminListFindFirstArgs<ExtArgs>>(
      args?: SelectSubset<T, AdminListFindFirstArgs<ExtArgs>>
    ): Prisma__AdminListClient<$Types.GetResult<AdminListPayload<ExtArgs>, T, 'findFirst'> | null, null, ExtArgs>

    /**
     * Find the first AdminList that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AdminListFindFirstOrThrowArgs} args - Arguments to find a AdminList
     * @example
     * // Get one AdminList
     * const adminList = await prisma.adminList.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirstOrThrow<T extends AdminListFindFirstOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, AdminListFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__AdminListClient<$Types.GetResult<AdminListPayload<ExtArgs>, T, 'findFirstOrThrow'>, never, ExtArgs>

    /**
     * Find zero or more AdminLists that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AdminListFindManyArgs=} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all AdminLists
     * const adminLists = await prisma.adminList.findMany()
     * 
     * // Get first 10 AdminLists
     * const adminLists = await prisma.adminList.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const adminListWithIdOnly = await prisma.adminList.findMany({ select: { id: true } })
     * 
    **/
    findMany<T extends AdminListFindManyArgs<ExtArgs>>(
      args?: SelectSubset<T, AdminListFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Types.GetResult<AdminListPayload<ExtArgs>, T, 'findMany'>>

    /**
     * Create a AdminList.
     * @param {AdminListCreateArgs} args - Arguments to create a AdminList.
     * @example
     * // Create one AdminList
     * const AdminList = await prisma.adminList.create({
     *   data: {
     *     // ... data to create a AdminList
     *   }
     * })
     * 
    **/
    create<T extends AdminListCreateArgs<ExtArgs>>(
      args: SelectSubset<T, AdminListCreateArgs<ExtArgs>>
    ): Prisma__AdminListClient<$Types.GetResult<AdminListPayload<ExtArgs>, T, 'create'>, never, ExtArgs>

    /**
     * Delete a AdminList.
     * @param {AdminListDeleteArgs} args - Arguments to delete one AdminList.
     * @example
     * // Delete one AdminList
     * const AdminList = await prisma.adminList.delete({
     *   where: {
     *     // ... filter to delete one AdminList
     *   }
     * })
     * 
    **/
    delete<T extends AdminListDeleteArgs<ExtArgs>>(
      args: SelectSubset<T, AdminListDeleteArgs<ExtArgs>>
    ): Prisma__AdminListClient<$Types.GetResult<AdminListPayload<ExtArgs>, T, 'delete'>, never, ExtArgs>

    /**
     * Update one AdminList.
     * @param {AdminListUpdateArgs} args - Arguments to update one AdminList.
     * @example
     * // Update one AdminList
     * const adminList = await prisma.adminList.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    update<T extends AdminListUpdateArgs<ExtArgs>>(
      args: SelectSubset<T, AdminListUpdateArgs<ExtArgs>>
    ): Prisma__AdminListClient<$Types.GetResult<AdminListPayload<ExtArgs>, T, 'update'>, never, ExtArgs>

    /**
     * Delete zero or more AdminLists.
     * @param {AdminListDeleteManyArgs} args - Arguments to filter AdminLists to delete.
     * @example
     * // Delete a few AdminLists
     * const { count } = await prisma.adminList.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
    **/
    deleteMany<T extends AdminListDeleteManyArgs<ExtArgs>>(
      args?: SelectSubset<T, AdminListDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AdminLists.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AdminListUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many AdminLists
     * const adminList = await prisma.adminList.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    updateMany<T extends AdminListUpdateManyArgs<ExtArgs>>(
      args: SelectSubset<T, AdminListUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one AdminList.
     * @param {AdminListUpsertArgs} args - Arguments to update or create a AdminList.
     * @example
     * // Update or create a AdminList
     * const adminList = await prisma.adminList.upsert({
     *   create: {
     *     // ... data to create a AdminList
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the AdminList we want to update
     *   }
     * })
    **/
    upsert<T extends AdminListUpsertArgs<ExtArgs>>(
      args: SelectSubset<T, AdminListUpsertArgs<ExtArgs>>
    ): Prisma__AdminListClient<$Types.GetResult<AdminListPayload<ExtArgs>, T, 'upsert'>, never, ExtArgs>

    /**
     * Count the number of AdminLists.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AdminListCountArgs} args - Arguments to filter AdminLists to count.
     * @example
     * // Count the number of AdminLists
     * const count = await prisma.adminList.count({
     *   where: {
     *     // ... the filter for the AdminLists we want to count
     *   }
     * })
    **/
    count<T extends AdminListCountArgs>(
      args?: Subset<T, AdminListCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AdminListCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a AdminList.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AdminListAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends AdminListAggregateArgs>(args: Subset<T, AdminListAggregateArgs>): Prisma.PrismaPromise<GetAdminListAggregateType<T>>

    /**
     * Group by AdminList.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AdminListGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends AdminListGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AdminListGroupByArgs['orderBy'] }
        : { orderBy?: AdminListGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, AdminListGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAdminListGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the AdminList model
   */
  readonly fields: AdminListFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for AdminList.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export class Prisma__AdminListClient<T, Null = never, ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> implements Prisma.PrismaPromise<T> {
    private readonly _dmmf;
    private readonly _queryType;
    private readonly _rootField;
    private readonly _clientMethod;
    private readonly _args;
    private readonly _dataPath;
    private readonly _errorFormat;
    private readonly _measurePerformance?;
    private _isList;
    private _callsite;
    private _requestPromise?;
    readonly [Symbol.toStringTag]: 'PrismaPromise';
    constructor(_dmmf: runtime.DMMFClass, _queryType: 'query' | 'mutation', _rootField: string, _clientMethod: string, _args: any, _dataPath: string[], _errorFormat: ErrorFormat, _measurePerformance?: boolean | undefined, _isList?: boolean);


    private get _document();
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): Promise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): Promise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): Promise<T>;
  }



  /**
   * Fields of the AdminList model
   */ 
  interface AdminListFieldRefs {
    readonly id: FieldRef<"AdminList", 'Int'>
    readonly username: FieldRef<"AdminList", 'String'>
    readonly admin: FieldRef<"AdminList", 'String'>
    readonly region: FieldRef<"AdminList", 'String'>
    readonly role: FieldRef<"AdminList", 'String'>
    readonly removal_date: FieldRef<"AdminList", 'DateTime'>
    readonly createdAt: FieldRef<"AdminList", 'DateTime'>
    readonly updatedAt: FieldRef<"AdminList", 'DateTime'>
  }
    

  // Custom InputTypes

  /**
   * AdminList findUnique
   */
  export type AdminListFindUniqueArgs<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AdminList
     */
    select?: AdminListSelect<ExtArgs> | null
    /**
     * Filter, which AdminList to fetch.
     */
    where: AdminListWhereUniqueInput
  }


  /**
   * AdminList findUniqueOrThrow
   */
  export type AdminListFindUniqueOrThrowArgs<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AdminList
     */
    select?: AdminListSelect<ExtArgs> | null
    /**
     * Filter, which AdminList to fetch.
     */
    where: AdminListWhereUniqueInput
  }


  /**
   * AdminList findFirst
   */
  export type AdminListFindFirstArgs<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AdminList
     */
    select?: AdminListSelect<ExtArgs> | null
    /**
     * Filter, which AdminList to fetch.
     */
    where?: AdminListWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AdminLists to fetch.
     */
    orderBy?: AdminListOrderByWithRelationInput | AdminListOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AdminLists.
     */
    cursor?: AdminListWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AdminLists from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AdminLists.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AdminLists.
     */
    distinct?: AdminListScalarFieldEnum | AdminListScalarFieldEnum[]
  }


  /**
   * AdminList findFirstOrThrow
   */
  export type AdminListFindFirstOrThrowArgs<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AdminList
     */
    select?: AdminListSelect<ExtArgs> | null
    /**
     * Filter, which AdminList to fetch.
     */
    where?: AdminListWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AdminLists to fetch.
     */
    orderBy?: AdminListOrderByWithRelationInput | AdminListOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AdminLists.
     */
    cursor?: AdminListWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AdminLists from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AdminLists.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AdminLists.
     */
    distinct?: AdminListScalarFieldEnum | AdminListScalarFieldEnum[]
  }


  /**
   * AdminList findMany
   */
  export type AdminListFindManyArgs<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AdminList
     */
    select?: AdminListSelect<ExtArgs> | null
    /**
     * Filter, which AdminLists to fetch.
     */
    where?: AdminListWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AdminLists to fetch.
     */
    orderBy?: AdminListOrderByWithRelationInput | AdminListOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing AdminLists.
     */
    cursor?: AdminListWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AdminLists from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AdminLists.
     */
    skip?: number
    distinct?: AdminListScalarFieldEnum | AdminListScalarFieldEnum[]
  }


  /**
   * AdminList create
   */
  export type AdminListCreateArgs<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AdminList
     */
    select?: AdminListSelect<ExtArgs> | null
    /**
     * The data needed to create a AdminList.
     */
    data: XOR<AdminListCreateInput, AdminListUncheckedCreateInput>
  }


  /**
   * AdminList update
   */
  export type AdminListUpdateArgs<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AdminList
     */
    select?: AdminListSelect<ExtArgs> | null
    /**
     * The data needed to update a AdminList.
     */
    data: XOR<AdminListUpdateInput, AdminListUncheckedUpdateInput>
    /**
     * Choose, which AdminList to update.
     */
    where: AdminListWhereUniqueInput
  }


  /**
   * AdminList updateMany
   */
  export type AdminListUpdateManyArgs<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> = {
    /**
     * The data used to update AdminLists.
     */
    data: XOR<AdminListUpdateManyMutationInput, AdminListUncheckedUpdateManyInput>
    /**
     * Filter which AdminLists to update
     */
    where?: AdminListWhereInput
  }


  /**
   * AdminList upsert
   */
  export type AdminListUpsertArgs<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AdminList
     */
    select?: AdminListSelect<ExtArgs> | null
    /**
     * The filter to search for the AdminList to update in case it exists.
     */
    where: AdminListWhereUniqueInput
    /**
     * In case the AdminList found by the `where` argument doesn't exist, create a new AdminList with this data.
     */
    create: XOR<AdminListCreateInput, AdminListUncheckedCreateInput>
    /**
     * In case the AdminList was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AdminListUpdateInput, AdminListUncheckedUpdateInput>
  }


  /**
   * AdminList delete
   */
  export type AdminListDeleteArgs<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AdminList
     */
    select?: AdminListSelect<ExtArgs> | null
    /**
     * Filter which AdminList to delete.
     */
    where: AdminListWhereUniqueInput
  }


  /**
   * AdminList deleteMany
   */
  export type AdminListDeleteManyArgs<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> = {
    /**
     * Filter which AdminLists to delete
     */
    where?: AdminListWhereInput
  }


  /**
   * AdminList without action
   */
  export type AdminListArgs<ExtArgs extends $Extensions.Args = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AdminList
     */
    select?: AdminListSelect<ExtArgs> | null
  }



  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const BanListScalarFieldEnum: {
    id: 'id',
    username: 'username',
    admin: 'admin',
    region: 'region',
    reason: 'reason',
    removal_date: 'removal_date',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type BanListScalarFieldEnum = (typeof BanListScalarFieldEnum)[keyof typeof BanListScalarFieldEnum]


  export const WhiteListScalarFieldEnum: {
    id: 'id',
    username: 'username',
    admin: 'admin',
    region: 'region',
    reason: 'reason',
    removal_date: 'removal_date',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type WhiteListScalarFieldEnum = (typeof WhiteListScalarFieldEnum)[keyof typeof WhiteListScalarFieldEnum]


  export const AdminListScalarFieldEnum: {
    id: 'id',
    username: 'username',
    admin: 'admin',
    region: 'region',
    role: 'role',
    removal_date: 'removal_date',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type AdminListScalarFieldEnum = (typeof AdminListScalarFieldEnum)[keyof typeof AdminListScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  /**
   * Field references 
   */


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    
  /**
   * Deep Input Types
   */


  export type BanListWhereInput = {
    AND?: BanListWhereInput | BanListWhereInput[]
    OR?: BanListWhereInput[]
    NOT?: BanListWhereInput | BanListWhereInput[]
    id?: IntFilter<"BanList"> | number
    username?: StringFilter<"BanList"> | string
    admin?: StringFilter<"BanList"> | string
    region?: StringFilter<"BanList"> | string
    reason?: StringNullableFilter<"BanList"> | string | null
    removal_date?: DateTimeNullableFilter<"BanList"> | Date | string | null
    createdAt?: DateTimeFilter<"BanList"> | Date | string
    updatedAt?: DateTimeFilter<"BanList"> | Date | string
  }

  export type BanListOrderByWithRelationInput = {
    id?: SortOrder
    username?: SortOrder
    admin?: SortOrder
    region?: SortOrder
    reason?: SortOrderInput | SortOrder
    removal_date?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type BanListWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: BanListWhereInput | BanListWhereInput[]
    OR?: BanListWhereInput[]
    NOT?: BanListWhereInput | BanListWhereInput[]
    username?: StringFilter<"BanList"> | string
    admin?: StringFilter<"BanList"> | string
    region?: StringFilter<"BanList"> | string
    reason?: StringNullableFilter<"BanList"> | string | null
    removal_date?: DateTimeNullableFilter<"BanList"> | Date | string | null
    createdAt?: DateTimeFilter<"BanList"> | Date | string
    updatedAt?: DateTimeFilter<"BanList"> | Date | string
  }, "id">

  export type BanListOrderByWithAggregationInput = {
    id?: SortOrder
    username?: SortOrder
    admin?: SortOrder
    region?: SortOrder
    reason?: SortOrderInput | SortOrder
    removal_date?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: BanListCountOrderByAggregateInput
    _avg?: BanListAvgOrderByAggregateInput
    _max?: BanListMaxOrderByAggregateInput
    _min?: BanListMinOrderByAggregateInput
    _sum?: BanListSumOrderByAggregateInput
  }

  export type BanListScalarWhereWithAggregatesInput = {
    AND?: BanListScalarWhereWithAggregatesInput | BanListScalarWhereWithAggregatesInput[]
    OR?: BanListScalarWhereWithAggregatesInput[]
    NOT?: BanListScalarWhereWithAggregatesInput | BanListScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"BanList"> | number
    username?: StringWithAggregatesFilter<"BanList"> | string
    admin?: StringWithAggregatesFilter<"BanList"> | string
    region?: StringWithAggregatesFilter<"BanList"> | string
    reason?: StringNullableWithAggregatesFilter<"BanList"> | string | null
    removal_date?: DateTimeNullableWithAggregatesFilter<"BanList"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"BanList"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"BanList"> | Date | string
  }

  export type WhiteListWhereInput = {
    AND?: WhiteListWhereInput | WhiteListWhereInput[]
    OR?: WhiteListWhereInput[]
    NOT?: WhiteListWhereInput | WhiteListWhereInput[]
    id?: IntFilter<"WhiteList"> | number
    username?: StringFilter<"WhiteList"> | string
    admin?: StringFilter<"WhiteList"> | string
    region?: StringFilter<"WhiteList"> | string
    reason?: StringNullableFilter<"WhiteList"> | string | null
    removal_date?: DateTimeNullableFilter<"WhiteList"> | Date | string | null
    createdAt?: DateTimeFilter<"WhiteList"> | Date | string
    updatedAt?: DateTimeFilter<"WhiteList"> | Date | string
  }

  export type WhiteListOrderByWithRelationInput = {
    id?: SortOrder
    username?: SortOrder
    admin?: SortOrder
    region?: SortOrder
    reason?: SortOrderInput | SortOrder
    removal_date?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type WhiteListWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: WhiteListWhereInput | WhiteListWhereInput[]
    OR?: WhiteListWhereInput[]
    NOT?: WhiteListWhereInput | WhiteListWhereInput[]
    username?: StringFilter<"WhiteList"> | string
    admin?: StringFilter<"WhiteList"> | string
    region?: StringFilter<"WhiteList"> | string
    reason?: StringNullableFilter<"WhiteList"> | string | null
    removal_date?: DateTimeNullableFilter<"WhiteList"> | Date | string | null
    createdAt?: DateTimeFilter<"WhiteList"> | Date | string
    updatedAt?: DateTimeFilter<"WhiteList"> | Date | string
  }, "id">

  export type WhiteListOrderByWithAggregationInput = {
    id?: SortOrder
    username?: SortOrder
    admin?: SortOrder
    region?: SortOrder
    reason?: SortOrderInput | SortOrder
    removal_date?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: WhiteListCountOrderByAggregateInput
    _avg?: WhiteListAvgOrderByAggregateInput
    _max?: WhiteListMaxOrderByAggregateInput
    _min?: WhiteListMinOrderByAggregateInput
    _sum?: WhiteListSumOrderByAggregateInput
  }

  export type WhiteListScalarWhereWithAggregatesInput = {
    AND?: WhiteListScalarWhereWithAggregatesInput | WhiteListScalarWhereWithAggregatesInput[]
    OR?: WhiteListScalarWhereWithAggregatesInput[]
    NOT?: WhiteListScalarWhereWithAggregatesInput | WhiteListScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"WhiteList"> | number
    username?: StringWithAggregatesFilter<"WhiteList"> | string
    admin?: StringWithAggregatesFilter<"WhiteList"> | string
    region?: StringWithAggregatesFilter<"WhiteList"> | string
    reason?: StringNullableWithAggregatesFilter<"WhiteList"> | string | null
    removal_date?: DateTimeNullableWithAggregatesFilter<"WhiteList"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"WhiteList"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"WhiteList"> | Date | string
  }

  export type AdminListWhereInput = {
    AND?: AdminListWhereInput | AdminListWhereInput[]
    OR?: AdminListWhereInput[]
    NOT?: AdminListWhereInput | AdminListWhereInput[]
    id?: IntFilter<"AdminList"> | number
    username?: StringFilter<"AdminList"> | string
    admin?: StringFilter<"AdminList"> | string
    region?: StringFilter<"AdminList"> | string
    role?: StringFilter<"AdminList"> | string
    removal_date?: DateTimeNullableFilter<"AdminList"> | Date | string | null
    createdAt?: DateTimeFilter<"AdminList"> | Date | string
    updatedAt?: DateTimeFilter<"AdminList"> | Date | string
  }

  export type AdminListOrderByWithRelationInput = {
    id?: SortOrder
    username?: SortOrder
    admin?: SortOrder
    region?: SortOrder
    role?: SortOrder
    removal_date?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type AdminListWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: AdminListWhereInput | AdminListWhereInput[]
    OR?: AdminListWhereInput[]
    NOT?: AdminListWhereInput | AdminListWhereInput[]
    username?: StringFilter<"AdminList"> | string
    admin?: StringFilter<"AdminList"> | string
    region?: StringFilter<"AdminList"> | string
    role?: StringFilter<"AdminList"> | string
    removal_date?: DateTimeNullableFilter<"AdminList"> | Date | string | null
    createdAt?: DateTimeFilter<"AdminList"> | Date | string
    updatedAt?: DateTimeFilter<"AdminList"> | Date | string
  }, "id">

  export type AdminListOrderByWithAggregationInput = {
    id?: SortOrder
    username?: SortOrder
    admin?: SortOrder
    region?: SortOrder
    role?: SortOrder
    removal_date?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: AdminListCountOrderByAggregateInput
    _avg?: AdminListAvgOrderByAggregateInput
    _max?: AdminListMaxOrderByAggregateInput
    _min?: AdminListMinOrderByAggregateInput
    _sum?: AdminListSumOrderByAggregateInput
  }

  export type AdminListScalarWhereWithAggregatesInput = {
    AND?: AdminListScalarWhereWithAggregatesInput | AdminListScalarWhereWithAggregatesInput[]
    OR?: AdminListScalarWhereWithAggregatesInput[]
    NOT?: AdminListScalarWhereWithAggregatesInput | AdminListScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"AdminList"> | number
    username?: StringWithAggregatesFilter<"AdminList"> | string
    admin?: StringWithAggregatesFilter<"AdminList"> | string
    region?: StringWithAggregatesFilter<"AdminList"> | string
    role?: StringWithAggregatesFilter<"AdminList"> | string
    removal_date?: DateTimeNullableWithAggregatesFilter<"AdminList"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"AdminList"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"AdminList"> | Date | string
  }

  export type BanListCreateInput = {
    username: string
    admin: string
    region: string
    reason?: string | null
    removal_date?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type BanListUncheckedCreateInput = {
    id?: number
    username: string
    admin: string
    region: string
    reason?: string | null
    removal_date?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type BanListUpdateInput = {
    username?: StringFieldUpdateOperationsInput | string
    admin?: StringFieldUpdateOperationsInput | string
    region?: StringFieldUpdateOperationsInput | string
    reason?: NullableStringFieldUpdateOperationsInput | string | null
    removal_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BanListUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    username?: StringFieldUpdateOperationsInput | string
    admin?: StringFieldUpdateOperationsInput | string
    region?: StringFieldUpdateOperationsInput | string
    reason?: NullableStringFieldUpdateOperationsInput | string | null
    removal_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BanListUpdateManyMutationInput = {
    username?: StringFieldUpdateOperationsInput | string
    admin?: StringFieldUpdateOperationsInput | string
    region?: StringFieldUpdateOperationsInput | string
    reason?: NullableStringFieldUpdateOperationsInput | string | null
    removal_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BanListUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    username?: StringFieldUpdateOperationsInput | string
    admin?: StringFieldUpdateOperationsInput | string
    region?: StringFieldUpdateOperationsInput | string
    reason?: NullableStringFieldUpdateOperationsInput | string | null
    removal_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type WhiteListCreateInput = {
    username: string
    admin: string
    region: string
    reason?: string | null
    removal_date?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type WhiteListUncheckedCreateInput = {
    id?: number
    username: string
    admin: string
    region: string
    reason?: string | null
    removal_date?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type WhiteListUpdateInput = {
    username?: StringFieldUpdateOperationsInput | string
    admin?: StringFieldUpdateOperationsInput | string
    region?: StringFieldUpdateOperationsInput | string
    reason?: NullableStringFieldUpdateOperationsInput | string | null
    removal_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type WhiteListUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    username?: StringFieldUpdateOperationsInput | string
    admin?: StringFieldUpdateOperationsInput | string
    region?: StringFieldUpdateOperationsInput | string
    reason?: NullableStringFieldUpdateOperationsInput | string | null
    removal_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type WhiteListUpdateManyMutationInput = {
    username?: StringFieldUpdateOperationsInput | string
    admin?: StringFieldUpdateOperationsInput | string
    region?: StringFieldUpdateOperationsInput | string
    reason?: NullableStringFieldUpdateOperationsInput | string | null
    removal_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type WhiteListUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    username?: StringFieldUpdateOperationsInput | string
    admin?: StringFieldUpdateOperationsInput | string
    region?: StringFieldUpdateOperationsInput | string
    reason?: NullableStringFieldUpdateOperationsInput | string | null
    removal_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AdminListCreateInput = {
    username: string
    admin: string
    region: string
    role: string
    removal_date?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type AdminListUncheckedCreateInput = {
    id?: number
    username: string
    admin: string
    region: string
    role: string
    removal_date?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type AdminListUpdateInput = {
    username?: StringFieldUpdateOperationsInput | string
    admin?: StringFieldUpdateOperationsInput | string
    region?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    removal_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AdminListUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    username?: StringFieldUpdateOperationsInput | string
    admin?: StringFieldUpdateOperationsInput | string
    region?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    removal_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AdminListUpdateManyMutationInput = {
    username?: StringFieldUpdateOperationsInput | string
    admin?: StringFieldUpdateOperationsInput | string
    region?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    removal_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AdminListUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    username?: StringFieldUpdateOperationsInput | string
    admin?: StringFieldUpdateOperationsInput | string
    region?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    removal_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type BanListCountOrderByAggregateInput = {
    id?: SortOrder
    username?: SortOrder
    admin?: SortOrder
    region?: SortOrder
    reason?: SortOrder
    removal_date?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type BanListAvgOrderByAggregateInput = {
    id?: SortOrder
  }

  export type BanListMaxOrderByAggregateInput = {
    id?: SortOrder
    username?: SortOrder
    admin?: SortOrder
    region?: SortOrder
    reason?: SortOrder
    removal_date?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type BanListMinOrderByAggregateInput = {
    id?: SortOrder
    username?: SortOrder
    admin?: SortOrder
    region?: SortOrder
    reason?: SortOrder
    removal_date?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type BanListSumOrderByAggregateInput = {
    id?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type WhiteListCountOrderByAggregateInput = {
    id?: SortOrder
    username?: SortOrder
    admin?: SortOrder
    region?: SortOrder
    reason?: SortOrder
    removal_date?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type WhiteListAvgOrderByAggregateInput = {
    id?: SortOrder
  }

  export type WhiteListMaxOrderByAggregateInput = {
    id?: SortOrder
    username?: SortOrder
    admin?: SortOrder
    region?: SortOrder
    reason?: SortOrder
    removal_date?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type WhiteListMinOrderByAggregateInput = {
    id?: SortOrder
    username?: SortOrder
    admin?: SortOrder
    region?: SortOrder
    reason?: SortOrder
    removal_date?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type WhiteListSumOrderByAggregateInput = {
    id?: SortOrder
  }

  export type AdminListCountOrderByAggregateInput = {
    id?: SortOrder
    username?: SortOrder
    admin?: SortOrder
    region?: SortOrder
    role?: SortOrder
    removal_date?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type AdminListAvgOrderByAggregateInput = {
    id?: SortOrder
  }

  export type AdminListMaxOrderByAggregateInput = {
    id?: SortOrder
    username?: SortOrder
    admin?: SortOrder
    region?: SortOrder
    role?: SortOrder
    removal_date?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type AdminListMinOrderByAggregateInput = {
    id?: SortOrder
    username?: SortOrder
    admin?: SortOrder
    region?: SortOrder
    role?: SortOrder
    removal_date?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type AdminListSumOrderByAggregateInput = {
    id?: SortOrder
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}