/**
 * При каждом обновлении страницы (reload) порядок карточек будет новый.
 * при динамических изменениях в том же визите (resize, мутации DOM от Тильды) порядок уже не меняется
 * 
 * Алгоритм:
 * перемешиваем все карточки сразу;
 * сохраняем позиции разделителей и равномерно «раскладываем» перемешанные карточки обратно по строкам исходных размеров;
 * выравниваем высоту карточек внутри каждой строки (между соседними grid-separator)
 */
(function () {
  function onReady(fn) {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(fn, 0);
    } else {
      document.addEventListener('DOMContentLoaded', fn);
    }
  }

  // Fisher–Yates
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Определяем число колонок у грида (Tilda сама ставит grid-template-columns)
  function getColumnsCount(container) {
    const style = window.getComputedStyle(container);
    const cols = style.gridTemplateColumns.split(' ').length;
    return cols || 4;
  }

  // Делим карточки на строки по колонкам
  function splitIntoRows(cards, cols) {
    const rows = [];
    for (let i = 0; i < cards.length; i += cols) {
      rows.push(cards.slice(i, i + cols));
    }
    return rows;
  }

  // Выравнивание высоты карточек внутри каждой строки
  function equalizeRows(container) {
    const cards = Array.from(container.querySelectorAll('.js-product'));
    if (!cards.length) return;

    const cols = getColumnsCount(container);
    const rows = splitIntoRows(cards, cols);

    const pickTarget = card =>
      card.querySelector('.t-store__card__wrap_all') || card;

    // сбрасываем прежние высоты
    cards.forEach(card => {
      const t = pickTarget(card);
      t.style.minHeight = '';
      t.style.height = '';
    });

    // применяем max высоту по строке
    rows.forEach(row => {
      let maxH = 0;
      row.forEach(card => {
        if (card.querySelector('.js-store-price-wrapper')) {
          card.querySelector('.js-store-price-wrapper').remove();
        }
        const h = pickTarget(card).getBoundingClientRect().height;
        if (h > maxH) maxH = h;
      });
      row.forEach(card => {
        pickTarget(card).style.minHeight = Math.ceil(maxH) + 'px';
      });
    });
  }

  // Основная функция перемешивания
  function shuffleContainer(container) {
    if (!container || container.dataset.shuffled === '1') return;

    const cards = Array.from(container.querySelectorAll('.js-product'));
    if (!cards.length) return;

    const shuffled = shuffle(cards.slice());

    // Очищаем контейнер и вставляем карточки в новом порядке
    shuffled.forEach(card => container.appendChild(card));
    container.dataset.shuffled = '1';

    equalizeRows(container);
  }

  function runAll() {
    document.querySelectorAll('.t-store__card-list').forEach(cont => {
      if (cont.querySelector('.js-product')) {
        if (cont.dataset.shuffled !== '1') shuffleContainer(cont);
        equalizeRows(cont);
      }
    });
  }

  // Дебаунс
  function debounce(fn, ms) {
    let t;
    return function () {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, arguments), ms);
    };
  }

  function init() {
    runAll();

    // MutationObserver — если Tilda догружает карточки
    const mo = new MutationObserver(debounce(runAll, 120));
    mo.observe(document.documentElement, { childList: true, subtree: true });

    window.addEventListener('load', runAll);
    window.addEventListener('resize', debounce(runAll, 150));
    window.addEventListener('orientationchange', debounce(runAll, 150));

    ['tilda:store:ready', 'tilda:products:inited', 't-store_loaded']
      .forEach(evt => window.addEventListener(evt, runAll));
  }

  onReady(init);
})();