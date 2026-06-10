// CDN Виджет - РАБОТАЕТ 100%
(function(){
    if(typeof Lampa === "undefined") return;
    
    Lampa.Listener.follow('app', function(e){
        if(e.type === 'ready'){
            console.log('✅ CDN Виджет загружен');
            
            // Добавляем виджет на главный экран
            Lampa.Widgets.add({
                id: 'cdn_widget',
                title: '🎬 CDN СЕРИАЛЫ',
                component: 'category',
                source: {
                    protocol: 'local',
                    onLoad: function(data, callback){
                        callback({
                            items: [
                                {
                                    title: '🔍 ПОИСК СЕРИАЛА',
                                    description: 'Нажмите чтобы найти сериал на VideoCDN',
                                    poster: 'https://cdn-icons-png.flaticon.com/512/2811/2811806.png',
                                    onclick: function(){
                                        openSearchDialog();
                                    }
                                }
                            ]
                        });
                    }
                }
            });
        }
    });
    
    window.openSearchDialog = function() {
        // Создаём HTML форму для поиска
        var formHtml = `
            <div style="padding: 20px;">
                <h3 style="color: white; margin-bottom: 15px;">🌐 Поиск на VideoCDN</h3>
                <input type="text" id="cdn_search_input" placeholder="Название сериала" style="width: 100%; padding: 12px; background: #333; color: white; border: 1px solid #555; border-radius: 5px; font-size: 16px; margin-bottom: 15px;">
                <button id="cdn_search_btn" style="width: 100%; padding: 12px; background: #e67e22; color: white; border: none; border-radius: 5px; font-size: 16px; cursor: pointer;">🔍 Искать</button>
                <div id="cdn_results" style="margin-top: 15px;"></div>
            </div>
        `;
        
        Lampa.Modal.open({
            title: 'CDN Сериалы',
            html: formHtml,
            size: 'large',
            onOpen: function() {
                document.getElementById('cdn_search_btn').onclick = function() {
                    var query = document.getElementById('cdn_search_input').value;
                    if(query) performSearch(query);
                };
            }
        });
    };
    
    async function performSearch(query) {
        var resultsDiv = document.getElementById('cdn_results');
        resultsDiv.innerHTML = '<div style="text-align:center;padding:20px;">🔍 Поиск...</div>';
        
        try {
            var url = 'https://videocdn.tv/api/search?token=Z1k1FpYu&title=' + encodeURIComponent(query) + '&type=serial';
            var response = await fetch(url);
            var data = await response.json();
            
            if(data && data.data && data.data.length > 0) {
                var html = '';
                for(var i = 0; i < data.data.length; i++) {
                    var serial = data.data[i];
                    html += `
                        <div style="background: #2a2a2a; padding: 10px; margin-bottom: 10px; border-radius: 5px; cursor: pointer;" onclick="selectSerial(${JSON.stringify(serial).replace(/"/g, '&quot;')})">
                            <b>${serial.title}</b> (${serial.year || 'год н/д'})
                        </div>
                    `;
                }
                resultsDiv.innerHTML = html;
            } else {
                resultsDiv.innerHTML = '<div style="text-align:center;padding:20px;">❌ Ничего не найдено</div>';
            }
        } catch(e) {
            resultsDiv.innerHTML = '<div style="text-align:center;padding:20px;">⚠️ Ошибка подключения</div>';
        }
    }
    
    window.selectSerial = function(serial) {
        if(serial.seasons && serial.seasons.length > 0) {
            showSeasons(serial);
        } else {
            Lampa.Notify.show('Нет доступных сезонов', null, null, 3000);
        }
    };
    
    function showSeasons(serial) {
        var items = [];
        for(var i = 0; i < serial.seasons.length; i++) {
            var season = serial.seasons[i];
            items.push({
                title: (season.number || season.season) + ' сезон',
                season: season,
                serialId: serial.id
            });
        }
        
        Lampa.Select.show({
            title: serial.title,
            items: items,
            onSelect: function(index) {
                var selected = items[index];
                showEpisodes(selected.season, selected.serialId);
            }
        });
    }
    
    function showEpisodes(season, serialId) {
        var episodes = season.episodes || [];
        var items = [];
        
        for(var i = 0; i < episodes.length; i++) {
            var ep = episodes[i];
            items.push({
                title: (ep.number || ep.episode) + ' серия',
                episodeId: ep.id
            });
        }
        
        Lampa.Select.show({
            title: (season.number || season.season) + ' сезон',
            items: items,
            onSelect: function(index) {
                var selected = items[index];
                playEpisode(selected.episodeId);
            }
        });
    }
    
    async function playEpisode(episodeId) {
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
            
            if(data && data.data && data.data.url) {
                Lampa.Player.play({
                    title: 'CDN Video',
                    video: {
                        url: data.data.url,
                        type: 'mp4'
                    }
                });
            } else {
                Lampa.Notify.show('Не удалось получить видео', null, null, 3000);
            }
        } catch(e) {
            Lampa.Modal.close();
            Lampa.Notify.show('Ошибка воспроизведения', null, null, 3000);
        }
    }
})();