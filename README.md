# HyperStorage: Storage Manager for JavaScript/TypeScript

[![npm version](https://img.shields.io/npm/v/hyperstorage-js.svg)](https://www.npmjs.com/package/hyperstorage-js)
[![npm downloads](https://img.shields.io/npm/dt/hyperstorage-js.svg)](https://www.npmjs.com/package/hyperstorage-js)
[![jsDelivr](https://data.jsdelivr.com/v1/package/npm/hyperstorage-js/badge)](https://www.jsdelivr.com/package/npm/hyperstorage-js)

## Description

A lightweight wrapper for Storage interfaces (e.g., `localStorage` or `sessionStorage`) with **efficient caching** and **type-preserving serialization**.

The biggest burdens of working with the **Storage API** is verifying values on every read, providing proper default values and only being able to store strings, having to `JSON.stringify()` and `JSON.parse()` manually everytime. This package eliminates this all by providing a safe, automatic and efficient wrapper that handles everything for you. You can read/store numbers and objects without any extra steps, lose no performance and improve code readability.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Constructor Syntax](#constructor-syntax)
- [Usage](#usage)
  - [Putting a New Value in Storage](#putting-a-new-value-in-storage)
  - [Using Another Storage API](#using-another-storage-api)
  - [Using Encoding and Decoding Functions](#using-encoding-and-decoding-functions)
  - [Reset to Default](#reset-to-default)
- [TypeScript Usage](#typescript-usage)
  - [Using Type Parameter `T` in `HyperStorage<T>`](#using-type-parameter-t-in-hyperstoraget)
  - [Using `sync()`](#using-sync)
- [Supported Types In Storage](#supported-types-in-storage)
- [Class Reference](#class-reference)

<br>

## Features

- 📝 **Default values**: are automatically set when the key is not in Storage.
- 🧩 **(Super)JSON support**: automatically serializes and parses everything using [superjson](https://github.com/flightcontrolhq/superjson).
- 🧠 **TypeScript support**: full type safety with strongly typed keys, values, and callbacks.
- 🔒 **Optional encoding/decoding**: hooks to obfuscate data or change the serializer.
- ⚡ **Fast caching**: memory cache avoids repeated JSON convertions.
- 🛠️ **Utility helpers**: use `.set()` and `.isDefault()` to simplify storage operations.
- 🌐 **Custom storage**: works with any object implementing the standard Storage API. (`localStorage`, `sessionStorage`, ...)

<br>

## Installation

```bash
# npm
npm install hyperstorage-js

# pnpm
pnpm add hyperstorage-js

# bun
bun i hyperstorage-js
```

<br>

## Constructor Syntax

```ts
class HyperStorage<T> {
  constructor(
    itemName: string,
    defaultValue: T,
    options: {
      encodeFn?: (value: T) => string
      decodeFn?: (value: string) => T
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
const defaultValue = { theme: 'light', language: 'en' }
const settingsStore = new HyperStorage('settings', defaultValue)

// If 'settings' is not present in localStorage, the defaultValue is set
console.log(settingsStore.value) // { theme: 'light', language: 'en' }

// Change theme to dark (one of multiple ways)
settingsStore.set('theme', 'dark')

console.log(settingsStore.value) // { theme: 'dark', language: 'en' }
console.log(window.localStorage) // Storage {userSettings: '{"json":{"theme":"dark","language":"en"}}', length: 1}
```

### Putting a New Value in Storage

The default method that works for all use cases is the `value` setter.

```js
store.value = 'anything'
```

The [`set()` (click)](#setkeyorcallback-keyof-t--value-t--t-value-tkeyof-t-t) method is a handy wrapper for assigning and can be used as shown in the examples below, which are sorted from best to worst practice.

<details>
<summary><strong>Object: Change Only One Property</strong></summary>

```js
// Property setter
settingsStore.set('theme', 'dark')

// Callback setter
settingsStore.set((v) => (v.theme = 'dark'))

// Spread operator
settingsStore.value = { ...settingsStore.value, theme: 'dark' }
```

</details>

<details>
<summary><strong>Number: Increment</strong></summary>

```js
// Increment operator
numberStore.value += 2

// Callback setter
numberStore.set((v) => (v += 2))

// Assign new value
numberStore.value = numberStore.value + 2
```

</details>

### Using Another Storage API

Use `sessionStorage` to only remember data for the duration of a session.

```js
const sessionStore = new HyperStorage('sessionData', 'none', {
  storage: window.sessionStorage,
})

sessionStore.value = 'temporary'
console.log(sessionStore.value) // 'temporary'
console.log(sessionStore.storage) // Storage {sessionData: '{"json":"temporary"}', length: 1}
```

### Using Encoding and Decoding Functions

If you want to make stored data harder to reverse-engineer, use the `encodeFn` and `decodeFn` options.

The default values for `encodeFn` and `decodeFn` are:

```ts
encodeFn = (value) => HyperStorage.superjson.stringify(value)
decodeFn = (value) => HyperStorage.superjson.parse(value)
```

<details>
<summary><strong>Base64 Example</strong></summary>

Apply Base64 encoding using JavaScript's `btoa` (String to Base64) and `atob` (Base64 to String).

```js
const sessionStore = new HyperStorage('sessionData', 'none', {
  encodeFn: (value) => btoa(value),
  decodeFn: (value) => atob(value),
})

sessionStore.value = 'temporary'
console.log(sessionStore.value) // 'temporary'
console.log(sessionStore.storage) // Storage  {sessionData: 'dGVtcG9yYXJ5', length: 1}
```

</details>

### Reset to Default

```js
console.log(sessionStore.value) // 'temporary'
console.log(sessionStore.defaultValue) // 'none'

sessionStore.reset()
console.log(sessionStore.value) // 'none'
```

<br>

## TypeScript Usage

### Using Type Parameter `T` in `HyperStorage<T>`

```ts
interface Settings {
  theme: 'system' | 'light' | 'dark'
  language: string
}

const defaultValue: Settings = { theme: 'system', language: 'en' }
const userStore = new HyperStorage<Settings>('userSettings', defaultValue)

// Property 'language' is missing in type '{ theme: "dark"; }' but required in type 'Settings'. ts(2741)
userStore.value = { theme: 'dark' }
```

### Using `sync()`

Safe usage of `sync()` requires explicit runtime validation before accessing any properties. It quickly becomes clear how type-unsafe `sync()` is and why it should be avoided.

```ts
// ... continues from the above example

const result = userStore.sync() // (method): unknown
// Right now, 'result' equals 'userStore.value' exactly

// 'result' is of type 'unknown'. ts(18046)
console.log(result.theme) // 'dark'

// No error, but unsafe
console.log(userStore.value.theme) // 'dark'

// Must narrow down to be safe
if (result && typeof result === 'object' && 'theme' in result) {
  // No error, safe
  console.log(result.theme) // 'dark'
}
```

<br>

## Supported Types in Storage

| Type      | Supported by Storage API | Supported by HyperStorage (trough superjson) |
| --------- | ------------------------ | -------------------------------------------- |
| string    | ✅                       | ✅                                           |
| undefined | ❌                       | ✅                                           |
| null      | ❌                       | ✅                                           |
| boolean   | ❌                       | ✅                                           |
| number    | ❌                       | ✅                                           |
| bigint    | ❌                       | ✅                                           |
| Object    | ❌                       | ✅                                           |
| Array     | ❌                       | ✅                                           |
| Set       | ❌                       | ✅                                           |
| Map       | ❌                       | ✅                                           |
| URL       | ❌                       | ✅                                           |
| Date      | ❌                       | ✅                                           |
| RegExp    | ❌                       | ✅                                           |
| Error     | ❌                       | ✅                                           |

<br>

## Class Reference

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

### `set(keyOrCallback: (keyof T) | ((value: T) => T), value?: T[keyof T]): T`

- If a **callback** is provided, it receives the current value and must return the new value.
- If a **key and value** are provided, it updates that single property on the stored object.
- Returns the updated stored value.

### `reset(): T`

- Resets the stored value to `defaultValue`.
- Updates both `Storage` and internal cache.
- Returns the restored default value.

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
- Returns the synchronized value.

The return type is `unknown` because data read from `Storage` cannot be type-checked or trusted at compile time because it may have been modified externally.

```js
// External change to storage (to be avoided)
localStorage.setItem('userSettings', '{"theme":"dark"}')

// Resynchronize the cache, optionally with a custom decoder
userStore.sync((value) => JSON.parse(value))

console.log(userStore.value) // { theme: 'dark' }
console.log(userStore.storage) // Storage {userSettings: '{"json":{"theme":"dark"}}', length: 1}
```

<br>

<details>
<summary><strong> Why <code>sync()</code> is unsafe</strong></summary>

1. The item in `Storage` is undecodable by the `decodeFn` passed to `sync()`.

```js
localStorage.setItem('userSettings', 'not an object')

// SyntaxError: Unexpected token 'o', "not an object" is not valid JSON
const result = userStore.sync((value) => JSON.parse(value))
// Execution continues because sync() uses a try-catch

console.log(result) // instance of SyntaxError

// Reset to default value
console.log(userStore.value) // {theme: 'system', language: 'en'}
```

2. The item in `Storage`, after being decoded, is not of type `T`.

```js
localStorage.setItem('userSettings', '{"not":"valid"}')

const result = userStore.sync((value) => JSON.parse(value))
console.log(result) // {not: 'valid'}
console.log(userStore.value) // {not: 'valid'}
```

No errors, but `result` and `userStore.value` are both not of type `T`.

This **must** be manually checked and `userStore.reset()` should be called if the check fails.

```js
// This example is specifically for type 'Settings'
if (
  result &&
  typeof result === 'object' &&
  'theme' in result &&
  'language' in result &&
  (result.theme === 'system' || result.theme === 'light' || result.theme === 'dark') &&
  typeof result.language === 'string'
) {
  // 'result' is of type 'T'
} else {
  // 'result' is not of type 'T'
  userStore.reset()
  console.log(userStore.value) // {theme: 'system', language: 'en'}
}

// 'userStore.value' is of type 'T'
```

</details>

<br>

## Source

[GitHub Repository](https://github.com/Khoeckman/HyperStorage)

<br>

## License

MIT
