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

  // Считать «мету строк»: сколько карточек в каждой строке и где стоит разделитель
  function getRowsMeta(container) {
    const children = Array.from(container.children);
    const meta = []; // [{size:number, sep:HTMLElement|null}]
    let size = 0;
    children.forEach(node => {
      if (node.classList.contains('js-product')) {
        size++;
      } else if (node.classList.contains('t-store__grid-separator')) {
        meta.push({ size, sep: node });
        size = 0;
      }
    });
    // хвост без разделителя
    if (size > 0) meta.push({ size, sep: null });
    return meta;
  }

  // Разложить перемешанные карточки по строкам, не двигая разделители
  function redistributeByRows(container, shuffled, meta) {
    let i = 0;
    meta.forEach(({ size, sep }) => {
      const chunk = shuffled.slice(i, i + size);
      i += size;
      chunk.forEach(card => container.insertBefore(card, sep));
    });
  }

  // Выравнивание высоты карточек в пределах каждой строки (между разделителями)
  function equalizeRows(container) {
    const rows = [];
    let row = [];
    // собираем строки заново
    Array.from(container.children).forEach(node => {
      if (node.classList.contains('js-product')) {
        row.push(node);
      } else if (node.classList.contains('t-store__grid-separator')) {
        if (row.length) rows.push(row);
        row = [];
      }
    });
    if (row.length) rows.push(row);

    // что именно выравнивать: всю карточку (обёртку)
    const pickTarget = (card) => card.querySelector('.t-store__card__wrap_all') || card;

    // сброс прошлого выравнивания
    rows.flat().forEach(card => {
      const t = pickTarget(card);
      t.style.minHeight = '';
      t.style.height = '';
    });

    // применяем max высоту в каждой строке
    rows.forEach(cardsInRow => {
      let maxH = 0;
      cardsInRow.forEach(card => {
        const t = pickTarget(card);
        const h = t.getBoundingClientRect().height;
        if (h > maxH) maxH = h;
      });
      cardsInRow.forEach(card => {
        const t = pickTarget(card);
        t.style.minHeight = Math.ceil(maxH) + 'px';
      });
    });
  }

  function shuffleContainer(container) {
    if (!container || container.dataset.shuffled === '1') return;

    // все карточки
    const cards = Array.from(container.querySelectorAll('.js-product'));
    if (!cards.length) return;

    // считаем исходные размеры строк (по разделителям)
    const meta = getRowsMeta(container);

    // перемешиваем все карточки одним пулом
    const shuffled = shuffle(cards.slice());

    // раскладываем обратно по строкам прежних размеров
    redistributeByRows(container, shuffled, meta);

    container.dataset.shuffled = '1';

    // после раскладки — выровнять высоту
    equalizeRows(container);
  }

  function runAll() {
    document.querySelectorAll('.js-store-grid-cont').forEach(cont => {
      if (cont.querySelector('.js-product')) {
        if (cont.dataset.shuffled !== '1') shuffleContainer(cont);
        equalizeRows(cont);
      }
    });
  }

  // Дебаунс
  function debounce(fn, ms) {
    let t; return function () { clearTimeout(t); t = setTimeout(() => fn.apply(this, arguments), ms); };
  }

  function init() {
    runAll();

    // Если Tilda дорисовывает магазин динамически
    const mo = new MutationObserver(debounce(runAll, 120));
    mo.observe(document.documentElement, { childList: true, subtree: true });

    // Полезные события Tilda (если есть)
    ['tilda:store:ready','tilda:products:inited','t-store_loaded']
      .forEach(evt => window.addEventListener(evt, runAll));

    // На всякий: когда картинки догружаются и меняют высоту
    window.addEventListener('load', runAll);
    window.addEventListener('resize', debounce(runAll, 150));
    window.addEventListener('orientationchange', debounce(runAll, 150));
  }

  onReady(init);
})();