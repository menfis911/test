// CDN Плеер для Lampa - Рабочая версия
(function() {
    'use strict';
    
    if (typeof Lampa === 'undefined') {
        console.log('Lampa not found');
        return;
    }
    
    let isReady = false;
    
    // Ждём готовности приложения
    Lampa.Listener.follow('app', function(e) {
        if (e.type === 'ready' && !isReady) {
            isReady = true;
            console.log('✅ CDN плагин запущен');
            initCDNButton();
        }
    });
    
    // Если уже готово
    if (window.appready && !isReady) {
        isReady = true;
        initCDNButton();
    }
    
    function initCDNButton() {
        // Используем правильный метод добавления кнопки
        Lampa.Activity.setOnShow(function(activity) {
            if (!activity || !activity.$el) return;
            
            // Проверяем, что это сериал
            var data = activity.data;
            if (!data || (data.method !== 'tv' && !data.isSerial && data.type !== 'serial')) {
                return;
            }
            
            setTimeout(function() {
                addButtonToCard(activity);
            }, 300);
        });
    }
    
    function addButtonToCard(activity) {
        var $card = activity.$el;
        
        // Ищем контейнер с кнопками
        var $buttons = $card.find('.full-buttons, .buttons, .info-buttons');
        
        if (!$buttons.length) {
            console.log('Buttons container not found');
            return;
        }
        
        // Проверяем, не добавлена ли уже кнопка
        if ($buttons.find('.cdn-watch-btn').length) {
            return;
        }
        
        // Создаём кнопку
        var $btn = $('<div>', {
            'class': 'full-button cdn-watch-btn',
            'style': 'display:inline-flex;align-items:center;padding:8px 16px;margin:0 5px;background:#e67e22;border-radius:8px;cursor:pointer'
        });
        
        $btn.html(`
            <span style="font-size:18px;margin-right:8px;">🌐</span>
            <span style="font-size:14px;">CDN Смотреть</span>
        `);
        
        $btn.on('click', function(e) {
            e.stopPropagation();
            openCDNSelector(activity.data);
        });
        
        $buttons.append($btn);
        console.log('✅ CDN кнопка добавлена');
    }
    
    function openCDNSelector(movieData) {
        var title = movieData.title || movieData.name;
        
        if (!title) {
            Lampa.Notify.show('Не удалось определить название', null, null, 2000);
            return;
        }
        
        // Простой диалог поиска
        var html = `
            <div style="padding:20px">
                <div style="margin-bottom:15px">
                    <input type="text" id="cdn_search_query" value="${title.replace(/"/g, '&quot;')}" style="width:100%;padding:10px;background:#333;color:#fff;border:1px solid #555;border-radius:5px">
                </div>
                <button id="cdn_search_btn" style="width:100%;padding:10px;background:#e67e22;color:#fff;border:none;border-radius:5px">🔍 Найти на CDN</button>
                <div id="cdn_search_result" style="margin-top:15px"></div>
            </div>
        `;
        
        Lampa.Modal.open({
            title: '🌐 CDN Поиск',
            html: html,
            size: 'medium',
            onOpen: function() {
                var btn = document.getElementById('cdn_search_btn');
                if (btn) {
                    btn.onclick = function() {
                        var query = document.getElementById('cdn_search_query').value;
                        if (query) searchOnCDN(query);
                    };
                }
            }
        });
    }
    
    async function searchOnCDN(query) {
        var resultDiv = document.getElementById('cdn_search_result');
        if (!resultDiv) return;
        
        resultDiv.innerHTML = '<div style="text-align:center;padding:20px">🔍 Ищем...</div>';
        
        try {
            var url = 'https://videocdn.tv/api/search?token=Z1k1FpYu&title=' + encodeURIComponent(query) + '&type=serial';
            var response = await fetch(url);
            var data = await response.json();
            
            if (data && data.data && data.data.length > 0) {
                var serials = data.data;
                var html = '<div style="margin-top:10px"><b>Найдено:</b></div>';
                
                for (var i = 0; i < Math.min(serials.length, 5); i++) {
                    var s = serials[i];
                    html += `
                        <div style="background:#444;padding:10px;margin:5px 0;border-radius:5px;cursor:pointer" onclick="window._selectSerial(${JSON.stringify(s).replace(/"/g, '&quot;')})">
                            📺 ${s.title} (${s.year || '?'}) - ${s.seasons ? s.seasons.length : 0} сезонов
                        </div>
                    `;
                }
                resultDiv.innerHTML = html;
                
                window._selectSerial = function(serial) {
                    Lampa.Modal.close();
                    showSeasons(serial);
                };
            } else {
                resultDiv.innerHTML = '<div style="text-align:center;padding:20px;color:#f00">❌ Ничего не найдено</div>';
            }
        } catch(e) {
            console.error(e);
            resultDiv.innerHTML = '<div style="text-align:center;padding:20px;color:#f00">⚠️ Ошибка подключения</div>';
        }
    }
    
    function showSeasons(serial) {
        if (!serial.seasons || serial.seasons.length === 0) {
            Lampa.Notify.show('Нет сезонов', null, null, 2000);
            return;
        }
        
        var items = [];
        for (var i = 0; i < serial.seasons.length; i++) {
            var season = serial.seasons[i];
            var seasonNum = season.number || season.season || (i + 1);
            items.push({
                title: seasonNum + ' сезон',
                season: season,
                seasonNum: seasonNum,
                serialId: serial.id
            });
        }
        
        Lampa.Select.show({
            title: serial.title,
            items: items,
            onSelect: function(index) {
                var selected = items[index];
                showEpisodes(selected);
            }
        });
    }
    
    function showEpisodes(seasonData) {
        var episodes = seasonData.season.episodes || [];
        
        if (episodes.length === 0) {
            Lampa.Notify.show('Нет серий', null, null, 2000);
            return;
        }
        
        var items = [];
        for (var i = 0; i < episodes.length; i++) {
            var ep = episodes[i];
            var epNum = ep.number || ep.episode || (i + 1);
            items.push({
                title: epNum + ' серия',
                episodeId: ep.id,
                episodeNum: epNum
            });
        }
        
        Lampa.Select.show({
            title: seasonData.seasonNum + ' сезон',
            items: items,
            onSelect: function(index) {
                var selected = items[index];
                playVideo(selected.episodeId, seasonData.seasonNum, selected.episodeNum);
            }
        });
    }
    
    async function playVideo(episodeId, seasonNum, episodeNum) {
        Lampa.Modal.open({
            title: 'Загрузка',
            html: '<div style="text-align:center;padding:20px">🎬 Получаем видео...</div>',
            size: 'small'
        });
        
        try {
            var url = 'https://videocdn.tv/api/stream?token=Z1k1FpYu&id=' + episodeId + '&quality=720';
            var response = await fetch(url);
            var data = await response.json();
            
            Lampa.Modal.close();
            
            if (data && data.data && data.data.url) {
                Lampa.Player.play({
                    title: seasonNum + ' сезон ' + episodeNum + ' серия',
                    video: {
                        url: data.data.url,
                        type: 'mp4'
                    }
                });
            } else {
                Lampa.Notify.show('Не удалось получить ссылку', null, null, 3000);
            }
        } catch(e) {
            Lampa.Modal.close();
            console.error(e);
            Lampa.Notify.show('Ошибка: ' + e.message, null, null, 3000);
        }
    }
})();