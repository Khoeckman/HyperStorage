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

  /** Key name under which the data is stored. */
  readonly itemName: string

  /** Default value used when the key does not exist in storage. */
  private readonly defaultValue: T

  /** Function to encode values before storing. */
  private readonly encodeFn: (value: string) => string

  /** Function to decode values when reading. */
  private readonly decodeFn: (value: string) => string

  /** The underlying storage backend (defaults to `window.localStorage`). */
  readonly storage: Storage

  /** Internal cached value to improve access speed. */
  #value?: T

  /**
   * Creates a new HyperStorage instance.
   *
   * @param {string} itemName - The key name under which the data will be stored.
   * @param {T} [defaultValue] - Default value assigned to the key if it does not exist yet.
   * @param {Object} [options={}] - Optional configuration parameters.
   * @param {(value: string) => string} [options.encodeFn] - Optional function to encode stored values.
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
      encodeFn?: (value: string) => string
      decodeFn?: (value: string) => string
      storage?: Storage
    } = {}
  ) {
    const { encodeFn, decodeFn, storage = window.localStorage } = options

    if (typeof itemName !== 'string')
      throw new TypeError('itemName is not a string')
    this.itemName = itemName
    this.defaultValue = defaultValue

    if (encodeFn && typeof encodeFn !== 'function')
      throw new TypeError('encodeFn is defined but is not a function')
    this.encodeFn = encodeFn || ((v) => v)

    if (decodeFn && typeof decodeFn !== 'function')
      throw new TypeError('decodeFn is defined but is not a function')
    this.decodeFn = decodeFn || ((v) => v)

    if (!(storage instanceof Storage))
      throw new TypeError('storage must be an instance of Storage')
    this.storage = storage

    this.sync()
  }

  /**
   * Sets the current value in storage.
   * Automatically caches, stringifies and encodes the value.
   */
  set value(value: T) {
    // Cache real value
    this.#value = value

    // Store stringified value with prefix to distinguish from raw strings
    let stringValue: string

    if (typeof value === 'string') {
      if (value[0] === '\0') stringValue = '\0' + value
      else stringValue = value
    } else if (
      value === undefined ||
      (typeof value === 'number' &&
        (isNaN(value) || value === Infinity || value === -Infinity))
    ) {
      // Manually stringify non-JSON values
      stringValue = '\0' + String(value)
    } else {
      stringValue = '\0' + JSON.stringify(value)
    }

    this.storage.setItem(this.itemName, this.encodeFn(stringValue))
  }

  /**
   * Gets the current cached value.
   */
  get value(): T {
    return this.#value ?? this.defaultValue
  }

  /**
   * Allows using the setter with a callback.
   */
  set(callback: (value: T) => T): T {
    return (this.value = callback(this.value))
  }

  /**
   * Synchronizes the internal cache (`#value`) with the actual value in storage.
   *
   * This is only necessary if the stored value may have been modified externally.
   * Using this function should be avoided when possible and is not type safe.
   */
  sync(decodeFn = this.decodeFn): unknown {
    let value = this.storage.getItem(this.itemName)

    // Reset value to defaultValue if it does not exist in storage
    if (typeof value !== 'string') return this.reset()

    // Reset value to defaultValue if the incoming value is not properly encoded
    try {
      value = decodeFn(value)
    } catch (err) {
      this.reset()
      console.error(err)
      return err
    }

    if (value[0] !== '\0') return (this.value = value as T) // Raw string value

    // Slice off '\0' prefix
    value = value.slice(1)

    if (value[0] === '\0') return (this.value = value as T) // Raw string value that started with '\0'

    // Parse non JSON
    if (value === 'undefined') return (this.value = undefined as any)
    if (value === 'NaN') return (this.value = NaN as any)
    if (value === 'Infinity') return (this.value = Infinity as any)
    if (value === '-Infinity') return (this.value = -Infinity as any)

    return (this.value = JSON.parse(value) as any)
  }

  /**
   * Resets the stored value to its configured default.
   *
   * Updates both the underlying storage and the internal cache.
   */
  reset(): T {
    return (this.value = this.defaultValue)
  }

  /**
   * Removes this specific key and its value from storage.
   *
   * Also clears the internal cache to prevent stale data access.
   */
  remove(): void {
    this.#value = undefined
    this.storage.removeItem(this.itemName)
  }

  /**
   * Clears **all** data fromstorage.
   *
   * This affects every key in the storage.
   * Also clears the internal cache to prevent stale data access.
   */
  clear(): void {
    this.#value = undefined
    this.storage.clear()
  }

  /**
   * Checks whether the current cached value matches the configured default value.
   *
   * Uses reference comparison for objects and strict equality for primitives.
   */
  isDefault(): boolean {
    return this.#value === this.defaultValue
  }
}

export default HyperStorage
