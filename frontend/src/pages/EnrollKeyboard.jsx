const ROWS = [
  [['`', 1], ['1', 1], ['2', 1], ['3', 1], ['4', 1], ['5', 1], ['6', 1], ['7', 1], ['8', 1], ['9', 1], ['0', 1], ['-', 1], ['=', 1], ['⌫', 2]],
  [['Tab', 1.5], ['q', 1], ['w', 1], ['e', 1], ['r', 1], ['t', 1], ['y', 1], ['u', 1], ['i', 1], ['o', 1], ['p', 1], ['[', 1], [']', 1], ['\\', 1.5]],
  [['Caps', 1.8], ['a', 1], ['s', 1], ['d', 1], ['f', 1], ['g', 1], ['h', 1], ['j', 1], ['k', 1], ['l', 1], [';', 1], ["'", 1], ['Enter', 2.2]],
  [['Shift', 2.3], ['z', 1], ['x', 1], ['c', 1], ['v', 1], ['b', 1], ['n', 1], ['m', 1], [',', 1], ['.', 1], ['/', 1], ['Shift', 2.3]],
  [['Space', 10]],
]

export default function EnrollKeyboard({ litKeys }) {
  return (
    <div className="kb">
      {ROWS.map((row, ri) => (
        <div className="kb-row" key={ri}>
          {row.map(([label, grow], ki) => {
            const isActive = litKeys.has(label)
            return (
              <div
                key={ki}
                className={`kb-key ${isActive ? 'active' : ''} ${label.length > 1 ? 'kb-key-wide' : ''}`}
                style={{ flexGrow: grow }}
              >
                {label === 'Space' ? '' : label}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}