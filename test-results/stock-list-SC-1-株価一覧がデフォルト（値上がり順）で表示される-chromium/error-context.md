# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - button "Open Next.js Dev Tools" [ref=e7] [cursor=pointer]:
    - img [ref=e8]
  - alert [ref=e11]
  - generic [ref=e12]:
    - heading "株価一覧" [level=1] [ref=e13]
    - generic [ref=e14]:
      - generic [ref=e15]: 並び替え
      - combobox "並び替え" [ref=e16]:
        - option "値上がり順" [selected]
        - option "値下がり順"
    - generic [ref=e17]: 読み込み中...
```