// Плагин: my-cdn-plugin.js
// Добавляет кнопку "Моё" в карточку контента

(function() {
    'use strict';

    // Название и настройки плагина
    const PLUGIN_NAME = 'my_cdn_plugin';
    const PLUGIN_TITLE = 'Моё';

    // Легальный бесплатный источник — например, публичный API или RSS
    // Здесь пример с условным API (замени на реальный легальный endpoint)
    const CDN_API_BASE = 'https://api.example-legal-cdn.com/v1';

    // Инициализация плагина
    function init() {
        // Подписываемся на событие открытия карточки контента
        Lampa.Listener.follow('full', function(event) {
            if (event.type === 'complite') {
                addMyButton(event.object);
            }
        });
    }

    // Добавляем кнопку "Моё" в карточку
    function addMyButton(card) {
        // Проверяем, что кнопки ещё нет
        if (card.activity && card.activity.render && !card.activity.render().find('.button--mycdn').length) {
            
            // Создаём кнопку в стиле Lampa
            const button = $(`
                <div class="full-start__button selector button--mycdn">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                    <span>${PLUGIN_TITLE}</span>
                </div>
            `);

            // Обработчик нажатия
            button.on('hover:enter', function() {
                openEpisodesModal(card.data);
            });

            // Вставляем кнопку в панель действий
            const actionsContainer = card.activity.render().find('.full-start__buttons');
            if (actionsContainer.length) {
                actionsContainer.append(button);
            }
        }
    }

    // Открываем модальное окно со списком серий/вариантов просмотра
    function openEpisodesModal(item) {
        const title = item.title || item.name || 'Без названия';
        const id = item.id || item.imdb_id || item.kinopoisk_id;

        // Показываем загрузку
        Lampa.Activity.push({
            url: '',
            title: title,
            component: 'my_cdn_episodes',
            id: id,
            item: item,
            page: 1
        });
    }

    // Регистрируем компонент для отображения списка серий
    Lampa.Component.add('my_cdn_episodes', function(object) {
        const comp = this;
        const scroll = new Lampa.Scroll({ mask: true, over: true });
        let items = [];
        let last_focus;

        this.create = function() {
            this.activity.loader(true);

            // Загружаем данные из CDN
            loadEpisodes(object.id, object.item)
                .then(data => {
                    this.activity.loader(false);
                    render(data);
                })
                .catch(err => {
                    this.activity.loader(false);
                    Lampa.Noty.show('Ошибка загрузки: ' + err.message);
                });

            return this.render();
        };

        this.render = function() {
            return scroll.render();
        };

        // Загрузка эпизодов из API
        async function loadEpisodes(contentId, item) {
            // Формируем запрос к легальному API
            // Пример: запрос к публичному API с фильтрацией по ID
            const url = `${CDN_API_BASE}/content/${contentId}/episodes`;
            
            // Если API требует дополнительных параметров (тип, год и т.д.)
            const params = new URLSearchParams({
                type: item.number_of_seasons ? 'tv' : 'movie',
                title: item.title || item.name
            });

            try {
                const response = await fetch(`${url}?${params}`);
                if (!response.ok) throw new Error('Network error');
                return await response.json();
            } catch (e) {
                // Fallback: если API недоступен, показываем демо-данные
                console.warn('CDN API недоступен, показываем демо:', e);
                return getDemoEpisodes(item);
            }
        }

        // Демо-данные для тестирования (замени на реальный API)
        function getDemoEpisodes(item) {
            const isSerial = item.number_of_seasons > 0;
            
            if (isSerial) {
                return {
                    seasons: [
                        {
                            season: 1,
                            episodes: [
                                { episode: 1, title: 'Пилотная серия', url: '#' },
                                { episode: 2, title: 'Серия 2', url: '#' },
                                { episode: 3, title: 'Серия 3', url: '#' }
                            ]
                        },
                        {
                            season: 2,
                            episodes: [
                                { episode: 1, title: 'Серия 1 (сезон 2)', url: '#' },
                                { episode: 2, title: 'Серия 2 (сезон 2)', url: '#' }
                            ]
                        }
                    ]
                };
            } else {
                return {
                    sources: [
                        { quality: '1080p', url: '#', source: 'Основной плеер' },
                        { quality: '720p', url: '#', source: 'Резервный плеер' }
                    ]
                };
            }
        }

        // Отрисовка списка
        function render(data) {
            const list = $('<div class="items-line layer--wheight"></div>');

            if (data.seasons) {
                // Отрисовка сериалов по сезонам
                data.seasons.forEach(season => {
                    const seasonBlock = $(`
                        <div class="season-block">
                            <div class="season-title">Сезон ${season.season}</div>
                        </div>
                    `);

                    season.episodes.forEach(ep => {
                        const episodeItem = $(`
                            <div class="episode-item selector">
                                <div class="episode-number">Серия ${ep.episode}</div>
                                <div class="episode-title">${ep.title}</div>
                            </div>
                        `);

                        episodeItem.on('hover:enter', function() {
                            playVideo(ep.url, ep.title);
                        });

                        seasonBlock.append(episodeItem);
                    });

                    list.append(seasonBlock);
                });
            } else if (data.sources) {
                // Отрисовка вариантов для фильма
                data.sources.forEach(src => {
                    const sourceItem = $(`
                        <div class="source-item selector">
                            <div class="source-quality">${src.quality}</div>
                            <div class="source-name">${src.source}</div>
                        </div>
                    `);

                    sourceItem.on('hover:enter', function() {
                        playVideo(src.url, object.item.title);
                    });

                    list.append(sourceItem);
                });
            }

            scroll.append(list);
            scroll.render().find('.selector').first().addClass('focus');
        }

        // Воспроизведение видео
        function playVideo(url, title) {
            if (url === '#') {
                Lampa.Noty.show('Демо-режим: воспроизведение недоступно');
                return;
            }

            // Открываем встроенный плеер Lampa
            Lampa.Player.play({
                url: url,
                title: title,
                timeline: true
            });
        }

        this.back = function() {
            Lampa.Activity.backward();
        };
    });

    // Запускаем плагин
    if (window.appready) {
        init();
    } else {
        Lampa.Listener.follow('app', function(e) {
            if (e.type === 'ready') init();
        });
    }

})();
