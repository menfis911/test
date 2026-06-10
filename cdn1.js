// CDN Parser for Lampa - GitHub Compatible Version
(function(){
    if(typeof Lampa === "undefined") return;
    
    Lampa.Listener.follow('app', function(e){
        if(e.type === 'ready'){
            console.log('✅ CDN плагин загружен через GitHub');
            
            Lampa.Menu.add({
                id: 'cdn_parser',
                title: '🌐 CDN Сериалы',
                icon: '<svg width="24" height="24" viewBox="0 0 24 24"><path fill="white" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>',
                onSelect: function(){
                    searchCDN();
                }
            });
        }
    });
    
    async function searchCDN(){
        Lampa.Modal.open({
            title: '🌐 Поиск на CDN',
            html: '<input type="text" id="cdn_search_input" placeholder="Название сериала" style="width:100%;padding:10px;margin:10px 0;background:#333;color:white;border:none;border-radius:5px;">',
            size: 'medium',
            buttons: [{
                title: 'Искать',
                onClick: function(){
                    var query = document.getElementById('cdn_search_input').value;
                    if(query){
                        Lampa.Modal.close();
                        performSearch(query);
                    }
                }
            }]
        });
    }
    
    async function performSearch(query){
        Lampa.Modal.open({
            title: 'Поиск',
            html: '<div style="text-align:center;padding:20px">🔍 Ищем: ' + query + '</div>',
            size: 'small'
        });
        
        try{
            var url = 'https://videocdn.tv/api/search?token=Z1k1FpYu&title=' + encodeURIComponent(query) + '&type=serial';
            var response = await fetch(url);
            var data = await response.json();
            
            Lampa.Modal.close();
            
            if(data && data.data && data.data.length > 0){
                showResults(data.data);
            } else {
                Lampa.Notify.show('Ничего не найдено', null, null, 3000);
            }
        } catch(e){
            Lampa.Modal.close();
            console.error(e);
            Lampa.Notify.show('Ошибка подключения к CDN', null, null, 3000);
        }
    }
    
    function showResults(results){
        var items = results.map(function(item){
            return {
                title: item.title + ' (' + (item.year || 'год неизвестен') + ')',
                data: item
            };
        });
        
        Lampa.Select.show({
            title: 'Выберите сериал',
            items: items,
            onSelect: function(index){
                var selected = results[index];
                if(selected.seasons && selected.seasons.length){
                    showSeasons(selected);
                } else {
                    Lampa.Notify.show('Нет доступных сезонов', null, null, 3000);
                }
            }
        });
    }
    
    function showSeasons(serial){
        var seasons = serial.seasons;
        var items = seasons.map(function(season){
            return {
                title: (season.number || season.season) + ' сезон',
                season: season,
                serialId: serial.id
            };
        });
        
        Lampa.Select.show({
            title: serial.title,
            items: items,
            onSelect: function(index){
                var selected = items[index];
                showEpisodes(selected.season, selected.serialId);
            }
        });
    }
    
    function showEpisodes(season, serialId){
        var episodes = season.episodes || [];
        var items = episodes.map(function(ep){
            return {
                title: (ep.number || ep.episode) + ' серия',
                episodeId: ep.id
            };
        });
        
        Lampa.Select.show({
            title: (season.number || season.season) + ' сезон',
            items: items,
            onSelect: function(index){
                var selected = items[index];
                playEpisode(selected.episodeId);
            }
        });
    }
    
    async function playEpisode(episodeId){
        Lampa.Modal.open({
            title: 'Загрузка',
            html: '<div style="text-align:center;padding:20px">🎬 Получаем видео...</div>',
            size: 'small'
        });
        
        try{
            var url = 'https://videocdn.tv/api/stream?token=Z1k1FpYu&id=' + episodeId + '&quality=720';
            var response = await fetch(url);
            var data = await response.json();
            
            Lampa.Modal.close();
            
            if(data && data.data && data.data.url){
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
        } catch(e){
            Lampa.Modal.close();
            console.error(e);
            Lampa.Notify.show('Ошибка воспроизведения', null, null, 3000);
        }
    }
    
})();