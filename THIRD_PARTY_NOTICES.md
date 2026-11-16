# Third-party notices

## Allan FCL, "Moneyball FM26" spreadsheet

The base of the role Performance (`app/src/engine/roles/items.ts`) reimplements the per-position indices from the "Moneyball FM26" spreadsheet by [Allan FCL](https://www.youtube.com/@AllanFCL), such as aerial dominance, defensive efficiency, Flair Index, the offensive creation index and GPI. They are recalculated per 90 minutes from the game's match stats, with some adjustments to the formulas.

## Jake Summers, "The Moneyball Playbook"

The role-specific part of the role Performance (`app/src/engine/roles/catalog.ts`) uses the stats that The Moneyball Playbook, by Jake Summers, ties to each Football Manager role, along with the book's idea of judging a player by the role he plays within his position. The book's tier cut-offs are not used.

## fm-scoring

Moneyball FM27's ability scores use the attribute weights and age benchmarks from fm-scoring
(https://github.com/jamiebolden/fm-scoring, `weights/fm27.toml`), which are tuned toward harvestgreen22's
FM27 attribute testing on fm-arena. They are used under the following licence:

```
MIT License

Copyright (c) 2026 Jamie Bolden

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
