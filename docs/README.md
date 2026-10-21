# docs/ — reverse-engineering evidence

Extracted from `Xenu.exe` 1.3.9 (SHA-256 `fb4f14392ae3eb92f9b84da479fb6b55a09f1f1b466b8d681b353979da1f9630`).

| File | What it is |
|---|---|
| `xenu_spec.json` | **Start here.** Consolidated spec: menus, INI keys, dialogs, list columns, report sections, color codes, scheme skip list, HTML tag tables, external tool URLs |
| `pea_resources.json` | REA Evidence record (`inspect-pe-resources`): PE resource tree with offsets and digests |
| `strings_data.txt` | Raw ASCII strings from the binary's data section (INI keys, export formats, error texts, report HTML templates) |
| `utf16_strings.json` | All UTF-16 strings with file offsets (UI dialogs, property pages, status formats) |

How these were produced: NSIS installer → 7-Zip extraction → `rea inspect-pe-resources`
(morluto/rea) + 7z resource dump + string scraping. See CONTRIBUTING.md for the workflow
and the resource offset cheat-sheet.
