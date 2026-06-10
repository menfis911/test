// CDN Плагин - Принудительное внедрение кнопки
(function(){
    if(typeof Lampa === "undefined") return;
    
    let buttonAdded = false;
    let checkInterval = null;
    
    Lampa.Listener.follow('app', function(e){
        if(e.type === 'ready'){
            console.log('✅ CDN плагин активирован');
            startWatchingForCard();
        }
    });
    
    if(window.appready){
        startWatchingForCard();
    }
    
    function startWatchingForCard(){
        // Проверяем каждую секунду, открыта ли карточка
        if(checkInterval) clearInterval(checkInterval);
        
        checkInterval = setInterval(function(){
            findAndAddButton();
        }, 1000);
    }
    
    function findAndAddButton(){
        // Ищем карточку сериала по разным селекторам
        var card = document.querySelector('.full-card, .movie-card, [class*="full"], [class*="movie"]');
        if(!card) return;
        
        // Проверяем, что это сериал
        var isSerial = false;
        var movieTitle = '';
        
        // Пытаемся найти название
        var titleEl = card.querySelector('.title, .name, [class*="title"]');
        if(titleEl) movieTitle = titleEl.innerText;
        
        // Проверяем наличие кнопок сезонов
        if(card.querySelector('.seasons, .serial-seasons, [class*="season"]')){
            isSerial = true;
        }
        
        // Если не определили - пробуем по URL
        if(!isSerial && window.location.hash){
            if(window.location.hash.includes('tv') || window.location.hash.includes('serial')){
                isSerial = true;
            }
        }
        
        if(!isSerial) return;
        
        // Ищем контейнер с кнопками
        var buttonsContainer = card.querySelector('.buttons, .full-buttons, .actions, [class*="button-container"]');
        if(!buttonsContainer) return;
        
        // Проверяем, есть ли уже наша кнопка
        if(document.querySelector('.cdn-custom-btn')) return;
        
        // Создаём кнопку
        var cdnBtn = document.createElement('div');
        cdnBtn.className = 'cdn-custom-btn';
        cdnBtn.style.cssText = 'display:inline-flex;align-items:center;padding:8px 15px;margin:0 5px;background:#e67e22;border-radius:8px;cursor:pointer;color:white;font-size:14px;';
        cdnBtn.innerHTML = '🌐 CDN Смотреть';
        
        cdnBtn.onclick = function(e){
            e.preventDefault();
            e.stopPropagation();
            if(movieTitle){
                showCDNDialog(movieTitle);
            } else {
                showManualInputDialog();
            }
        };
        
        buttonsContainer.appendChild(cdnBtn);
        console.log('✅ CDN кнопка принудительно добавлена! Название:', movieTitle);
        buttonAdded = true;
    }
    
    function showManualInputDialog(){
        var html = `
            <div style="padding:20px">
                <h3 style="color:white;margin-bottom:15px">🌐 Поиск на VideoCDN</h3>
                <input type="text" id="manual_title" placeholder="Название сериала" style="width:100%;padding:10px;background:#333;color:white;border:1px solid #555;border-radius:5px;margin-bottom:15px">
                <button id="search_btn" style="width:100%;padding:10px;background:#e67e22;color:white;border:none;border-radius:5px">🔍 Искать</button>
                <div id="manual_results" style="margin-top:15px"></div>
            </div>
        `;
        
        Lampa.Modal.open({
            title: 'CDN Сериалы',
            html: html,
            size: 'medium',
            onOpen: function(){
                document.getElementById('search_btn').onclick = function(){
                    var title = document.getElementById('manual_title').value;
                    if(title) searchCDN(title);
                };
            }
        });
    }
    
    function showCDNDialog(title){
        var html = `
            <div style="padding:20px">
                <h3 style="color:white;margin-bottom:15px">🌐 Поиск: ${title}</h3>
                <button id="search_btn" style="width:100%;padding:10px;background:#e67e22;color:white;border:none;border-radius:5px">🔍 Найти на CDN</button>
                <div id="manual_results" style="margin-top:15px"></div>
            </div>
        `;
        
        Lampa.Modal.open({
            title: 'CDN Сериалы',
            html: html,
            size: 'medium',
            onOpen: function(){
                document.getElementById('search_btn').onclick = function(){
                    searchCDN(title);
                };
            }
        });
    }
    
    async function searchCDN(query){
        var resultsDiv = document.getElementById('manual_results');
        if(!resultsDiv) return;
        
        resultsDiv.innerHTML = '<div style="text-align:center;padding:10px">🔍 Поиск...</div>';
        
        try{
            var url = 'https://videocdn.tv/api/search?token=Z1k1FpYu&title=' + encodeURIComponent(query) + '&type=serial';
            var response = await fetch(url);
            var data = await response.json();
            
            if(data && data.data && data.data.length > 0){
                var serials = data.data;
                var html = '<div style="margin-top:10px"><b>Результаты:</b></div>';
                
                for(var i = 0; i < serials.length; i++){
                    var s = serials[i];
                    var seasonsCount = s.seasons ? s.seasons.length : 0;
                    html += '<div style="background:#444;padding:10px;margin:5px 0;border-radius:5px;cursor:pointer" onclick="window._selectSerial(' + JSON.stringify(s).replace(/"/g, '&quot;') + ')">';
                    html += '📺 <b>' + s.title + '</b> (' + (s.year || 'год неизвестен') + ') - ' + seasonsCount + ' сезонов';
                    html += '</div>';
                }
                
                resultsDiv.innerHTML = html;
                
                window._selectSerial = function(serial){
                    Lampa.Modal.close();
                    selectSeason(serial);
                };
            } else {
                resultsDiv.innerHTML = '<div style="text-align:center;padding:10px;color:#f66">❌ Ничего не найдено</div>';
            }
        } catch(e){
            console.error(e);
            resultsDiv.innerHTML = '<div style="text-align:center;padding:10px;color:#f66">⚠️ Ошибка: ' + e.message + '</div>';
        }
    }
    
    function selectSeason(serial){
        if(!serial.seasons || serial.seasons.length === 0){
            Lampa.Notify.show('Нет доступных сезонов', null, null, 2000);
            return;
        }
        
        var items = [];
        for(var i = 0; i < serial.seasons.length; i++){
            var season = serial.seasons[i];
            var seasonNum = season.number || season.season || (i+1);
            items.push({
                title: seasonNum + ' сезон',
                seasonData: season,
                seasonNum: seasonNum,
                serialId: serial.id
            });
        }
        
        Lampa.Select.show({
            title: serial.title,
            items: items,
            onSelect: function(index){
                var selected = items[index];
                selectEpisode(selected);
            }
        });
    }
    
    function selectEpisode(seasonData){
        var episodes = seasonData.seasonData.episodes || [];
        
        if(episodes.length === 0){
            Lampa.Notify.show('Нет серий в этом сезоне', null, null, 2000);
            return;
        }
        
        var items = [];
        for(var i = 0; i < episodes.length; i++){
            var ep = episodes[i];
            var epNum = ep.number || ep.episode || (i+1);
            items.push({
                title: epNum + ' серия',
                episodeId: ep.id,
                episodeNum: epNum
            });
        }
        
        Lampa.Select.show({
            title: seasonData.seasonNum + ' сезон',
            items: items,
            onSelect: function(index){
                var selected = items[index];
                playVideo(selected.episodeId, seasonData.seasonNum, selected.episodeNum);
            }
        });
    }
    
    async function playVideo(episodeId, seasonNum, episodeNum){
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
                    title: seasonNum + ' сезон ' + episodeNum + ' серия',
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
            Lampa.Notify.show('Ошибка: ' + e.message, null, null, 3000);
        }
    }
})();