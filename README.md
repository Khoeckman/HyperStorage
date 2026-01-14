# HyperStorage: Storage Manager for JavaScript/TypeScript

A lightweight wrapper for Storage interfaces (e.g., `localStorage` or `sessionStorage`) with **efficient caching** and **type-preserving serialization**.

The biggest burdens of working with the **Storage API** is verifying values on every read, providing proper default values and only being able to store strings, having to `JSON.stringify()` and `JSON.parse()` manually everytime. This package eliminates all of this by providing a safe and automatic wrapper that handles everything at once. You can read/store numbers and objects without any extra steps and lose no performance.

[![npm version](https://img.shields.io/npm/v/hyperstorage-js.svg)](https://www.npmjs.com/package/hyperstorage-js)
[![npm downloads](https://img.shields.io/npm/dt/hyperstorage-js.svg)](https://www.npmjs.com/package/hyperstorage-js)
[![jsDelivr](https://data.jsdelivr.com/v1/package/npm/hyperstorage-js/badge)](https://www.jsdelivr.com/package/npm/hyperstorage-js)

<br>

## Features

- 📝 **Default values**: are automatically set when the key is not in Storage.
- 🧩 **JSON support**: automatically serializes and parses objects or non-string primitives (`undefined`, `NaN`, `Infinity`) which the Storage API does not support by default.
- ⚡ **Fast caching**: memory cache avoids repeated JSON convertions.
- 🔒 **Optional encoding/decoding** hooks to obfuscate data.
- 🌐 **Custom storage**: works with any object implementing the standard Storage API. (`localStorage`, `sessionStorage`, ...)

<br>

## Installation

```bash
# npm
npm install hyperstorage-js

# pnpm
pnpm add hyperstorage-js

# yarn
yarn add hyperstorage-js
```

<br>

## Constructor Syntax

```ts
class StorageManager<T> {
  constructor(
    itemName: string,
    defaultValue: T,
    options: {
      encodeFn?: (value: string) => string
      decodeFn?: (value: string) => string
      storage?: Storage
    } = {}
  )
}
```

<br>

## Usage

```js
import HyperStorage from 'hyperstorage-js'
```

```js
const defaultValue = { theme: 'dark', language: 'en' }
const userStore = new HyperStorage('userSettings', defaultValue)

// If 'userSettings' is not present in the Storage, the defaultValue is set:
console.log(userStore.value) // { theme: 'dark', language: 'en' }

// Change theme to light:
userStore.value = { theme: 'light', language: 'en' }

console.log(userStore.value) // { theme: 'light' }
console.log(userStore.value.theme) // 'light'

// Present in localStorage:
console.log(userStore.storage) // Storage {userSettings: '\x00{"theme":"light"}', length: 1}
```

### Different Ways to Assign a New Value

```js
// Overwrite all
userStore.value = { theme: 'light', language: 'en' }

// Overwrite specific
userStore.value = { ...userStore.value, theme: 'light' }

// Overwrite all using callback
userStore.set((v) => (v = { theme: 'light', language: 'en' }))

// Overwrite specific using callback
userStore.set((v) => (v.theme = 'light'))

// Overwrite and store result
const result = userStore.set((v) => (v.theme = 'light'))
```

### Using Another Storage API

Use `sessionStorage` to only remember data for the duration of a session.

```js
const sessionStore = new HyperStorage('sessionData', 'none', {
  storage: window.sessionStorage,
})

sessionStore.value = 'temporary'
console.log(sessionStore.value) // 'temporary'
console.log(sessionStore.storage) // Storage {sessionData: 'temporary', length: 1}
```

### Using Encoding and Decoding Functions

If you want to make stored data significantly harder to reverse-engineer, you should use the `encodeFn` and `decodeFn` options.

Apply Base64 encoding using JavaScript's `btoa` (String to Base64) and `atob` (Base64 to String).

```js
const sessionStore = new HyperStorage('sessionData', 'none', {
  encodeFn: (value) => btoa(value),
  decodeFn: (value) => atob(value),
})

sessionStore.value = 'temporary'
console.log(sessionStore.value) // 'temporary'
console.log(sessionStore.storage) // Storage {sessionData: 'hN0IEUdoqmJ/', length: 1}
```

### Resetting Values

```js
sessionStore.reset()
console.log(sessionStore.defaultValue) // 'none'
console.log(sessionStore.value) // 'none'
```

### Removing Values

Internally uses `Storage.removeItem()` to remove the item from storage and sets the cached value to `undefined`.

```js
sessionStore.remove()
console.log(sessionStore.value) // undefined
console.log(sessionStore.storage) // Storage {length: 0}
```

<br>

## TypeScript Usage

### Using Type Parameter `T`

```ts
interface Settings {
  theme: 'dark' | 'light'
  language: string
}

const defaultValue: Settings = { theme: 'dark', language: 'en' }
const userStore = new HyperStorage<Settings>('userSettings', defaultValue)

// Property 'language' is missing in type '{ theme: "light"; }' but required in type 'Settings'. ts(2741)
userStore.value = { theme: 'light' }
```

### Using `sync()`

Safe usage of `sync()` requires explicit runtime validation before accessing any properties. It quickly becomes clear how type-unsafe `sync()` is and why it should be avoided.

```ts
const current = userStore.sync() // (method): unknown

// 'current' is of type 'unknown'. ts(18046)
console.log(current.theme) // { theme: 'light' }

// Must narrow down
if (current && typeof current === 'object' && 'theme' in current) {
  console.log(current.theme)
}
```

<br>

## API

### `constructor<T>(itemName: string, defaultValue: T, options = {})`

- **itemName**: `string` — key under which the data is stored.
- **defaultValue**: default value to be stored if none exists.
- **options** _(optional)_:
  - `encodeFn` — function to encode values before writing to the `Storage`.
  - `decodeFn` — function to decode values when reading from the `Storage`.
  - `storage` — a `Storage` instance (e.g., `localStorage` or `sessionStorage`).

### `value`

- **Getter** — returns the cached value (very fast, does not use `JSON.parse`).
- **Setter** — sets and caches the value, serializing and encoding it into `Storage`.

### `set(callback: (value: T) => T): T`

- Updates the stored value using a callback function.
- The callback receives the current value and must return the new value.
- Returns the newly stored value.

### `reset(): T`

- Resets the stored value to `defaultValue`.
- Updates both `Storage` and internal cache.
- Returns the restored default value.

### `remove(): void`

- Removes the key and its value from `Storage`.
- Sets the internal cache to `undefined`.
- Returns nothing.

### `clear(): void`

- Clears **all keys** in `Storage`.
- Affects all stored data, not just this key.
- Returns nothing.

### `isDefault(): boolean`

- Checks whether the cached value equals the configured default.
- Uses reference comparison for objects and strict equality for primitives.
- Returns `true` if the current value matches the default, otherwise `false`.

```js
if (userStore.isDefault()) {
  console.log('value equals the default value.')
}
```

### `sync(decodeFn = this.decodeFn): unknown`

If the underlying `Storage` is not modified through the value setter, the internal cache will **not automatically update**. Use `sync()` to synchronize the internal cache with the actual value stored in `Storage`.

- **decodeFn** _(optional)_ — a function to decode values when reading (defaults to `this.decodeFn`).
- Reads the value from storage.
- Decodes it using `decodeFn`.
- Updates the internal cache.
- Returns the synchronized value. The return type is `unknown` because data read from `Storage` cannot be type-checked or trusted at compile time, especially when it may have been modified externally.

```js
// External change to storage (to be avoided)
localStorage.setItem('userSettings', '{"theme":"blue"}')

// Resynchronize the cache, optionally with a custom decoder
userStore.sync((value) => JSON.parse(value))

console.log(userStore.value) // { theme: 'blue' }
console.log(userStore.storage) // Storage {userSettings: '\x00{"theme":"blue"}', length: 1}
```

<br>

## Source

[GitHub Repository](https://github.com/Khoeckman/HyperStorage)

<br>

## License

MIT
