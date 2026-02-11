import superjson from 'superjson'

// Injected by Rollup
declare const __VERSION__: string

/**
 * @class HyperStorage
 * @classdesc A lightweight wrapper for localStorage/sessionStorage
 * with efficient caching and type-preserving serialization.
 *
 * @source https://github.com/Khoeckman/HyperStorage
 */
class HyperStorage<T> {
  /** Version of the library, injected via Rollup replace plugin. */
  static readonly version: string = __VERSION__

  static readonly superjson = superjson

  /** Key name under which the data is stored. */
  readonly itemName: string

  /** Default value used when the key does not exist in storage. */
  private readonly defaultValue: T

  /** Function to encode values before storing. */
  private readonly encodeFn: (value: T) => string

  /** Function to decode values when reading. */
  private readonly decodeFn: (value: string) => T

  /** The underlying storage backend (defaults to `window.localStorage`). */
  readonly storage: Storage

  /** Internal cached value to improve access speed. */
  #value!: T

  /**
   * Creates a new HyperStorage instance.
   *
   * @param {string} itemName - The key name under which the data will be stored.
   * @param {T} [defaultValue] - Default value assigned to the key if it does not exist yet.
   * @param {Object} [options={}] - Optional configuration parameters.
   * @param {(value: T) => string} [options.encodeFn] - Optional function to encode stored values.
   * @param {(value: string) => string} [options.decodeFn] - Optional function to decode stored values.
   * @param {Storage} [options.storage=window.localStorage] - Optional custom storage backend.
   *
   * @throws {TypeError} If `itemName` is not a string.
   * @throws {TypeError} If `encodeFn` or `decodeFn` are defined but not functions.
   * @throws {TypeError} If `storage` does not implement the standard Storage API.
   */
  constructor(
    itemName: string,
    defaultValue: T,
    options: {
      encodeFn?: (value: T) => string
      decodeFn?: (value: string) => T
      storage?: Storage
    } = {}
  ) {
    const { encodeFn, decodeFn, storage = window.localStorage } = options

    if (typeof itemName !== 'string') throw new TypeError('itemName is not a string')
    this.itemName = itemName

    this.defaultValue = defaultValue

    if (encodeFn && typeof encodeFn !== 'function') throw new TypeError('encodeFn is defined but is not a function')
    this.encodeFn = encodeFn || ((v) => HyperStorage.superjson.stringify(v))

    if (decodeFn && typeof decodeFn !== 'function') throw new TypeError('decodeFn is defined but is not a function')
    this.decodeFn = decodeFn || ((v) => HyperStorage.superjson.parse<T>(v))

    if (!(storage instanceof Storage)) throw new TypeError('storage must be an instance of Storage')
    this.storage = storage

    this.sync()
  }

  /**
   * Sets the current value in storage.
   * Automatically caches, stringifies and encodes the value.
   */
  set value(value: T) {
    this.#value = value // Cache real value
    this.storage.setItem(this.itemName, this.encodeFn(value))
  }

  /**
   * Gets the current cached value.
   */
  get value(): T {
    return this.#value
  }

  /**
   * Allows using the value setter with property assignment or a callback.
   */
  set<K extends keyof T>(key: K, value: T[K]): T
  set(callback: (value: T) => T): T
  set(keyOrCallback: keyof T | ((value: T) => T), value?: T[keyof T]): T {
    if (typeof keyOrCallback === 'function') return (this.value = keyOrCallback(this.#value))

    return (this.value = {
      ...this.#value,
      [keyOrCallback]: value,
    })
  }

  /**
   * Synchronizes the internal cache (`#value`) with the actual value in storage.
   *
   * This is only necessary if the stored value may have been modified externally.
   * Using this function should be avoided when possible and is not type safe.
   */
  sync(decodeFn = this.decodeFn): unknown {
    let json = this.storage.getItem(this.itemName)

    // Reset value to defaultValue if it does not exist in storage
    if (typeof json !== 'string') return this.reset()

    // Reset value to defaultValue if the incoming value is not properly encoded
    try {
      return (this.value = decodeFn(json))
    } catch (err) {
      console.error(err)
      this.reset()
      return err
    }
  }

  /**
   * Resets the stored value to its configured default.
   * Updates both the underlying storage and the internal cache.
   */
  reset(): T {
    return (this.value = this.defaultValue)
  }

  /**
   * Checks whether the current cached value matches the configured default value.
   * Uses reference comparison for objects and strict equality for primitives.
   */
  isDefault(): boolean {
    return this.#value === this.defaultValue
  }
}

export default HyperStorage
