import React, { useEffect, useRef, useState } from 'react';
import { regions } from './data';

export default function RegionPicker({ selected, onChange }) {
  const [query, setQuery] = useState('');
  const ref = useRef(null);
  function toggle(region) {
    onChange(selected.includes(region) ? selected.filter(item => item !== region) : [...selected, region]);
  }
  useEffect(() => {
    function outside(event) {
      if (!ref.current.contains(event.target)) ref.current.open = false;
    }
    function escape(event) {
      if (event.key === 'Escape' && ref.current.open) {
        ref.current.open = false;
        ref.current.querySelector('summary').focus();
      }
    }
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, []);
  return <fieldset>
    <legend>Где искать работу</legend>
    {selected.length > 0 && <div className="chips">
      {selected.map(region => <button type="button" key={region} onClick={() => toggle(region)} aria-label={`Убрать ${region}`}>{region} ×</button>)}
    </div>}
    <details className="region-picker" ref={ref} onToggle={event => { if (!event.currentTarget.open) setQuery(''); }}>
      <summary>Выбрать регионы и формат работы <span aria-hidden="true">▾</span></summary>
      <div className="region-popover">
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Найти регион…" aria-label="Поиск региона" />
        <label className="remote-option"><input type="checkbox" checked={selected.includes('Удалённая работа')} onChange={() => toggle('Удалённая работа')} />Удалённая работа</label>
        <div className="region-scroll">
          {regions.filter(region => region.toLowerCase().includes(query.toLowerCase())).map(region => <label key={region}>
            <input type="checkbox" checked={selected.includes(region)} onChange={() => toggle(region)} />{region}
          </label>)}
          {!regions.some(region => region.toLowerCase().includes(query.toLowerCase())) && <p className="small muted">Регион не найден.</p>}
        </div>
      </div>
    </details>
    <p className="small muted">Без выбора — вся Россия. Подойдут вакансии из любого выбранного региона или с удалённым форматом работы.</p>
  </fieldset>;
}
