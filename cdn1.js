// CDN Debug плагин
(function(){
    if(typeof Lampa === "undefined") return;
    
    Lampa.Listener.follow('app', function(e){
        if(e.type === 'ready'){
            console.log('🔧 CDN Debug плагин работает');
            
            // Добавляем принудительно кнопку в карточку
            Lampa.Activity.add({
                url: '',
                title: '🎬 CDN Смотреть',
                component: 'full',
                onSelect: function(item){
                    console.log('Нажата CDN кнопка для:', item);
                    Lampa.Notify.show('CDN плагин активен! Ищем видео...', null, null, 3000);
                    
                    // Простой тест
                    if(item.title){
                        testCDN(item.title);
                    }
                }
            });
        }
    });
    
    async function testCDN(title){
        Lampa.Modal.open({
            title: 'Поиск',
            html: '<div style="text-align:center;padding:20px">🔍 ' + title + '</div>',
            size: 'small'
        });
        
        try {
            const url = 'https://videocdn.tv/api/search?token=Z1k1FpYu&title=' + encodeURIComponent(title);
            const response = await fetch(url);
            const data = await response.json();
            
            Lampa.Modal.close();
            
            if(data && data.data && data.data.length){
                Lampa.Notify.show('✅ Найдено: ' + data.data[0].title, null, null, 3000);
            } else {
                Lampa.Notify.show('❌ Ничего не найдено', null, null, 3000);
            }
        } catch(e) {
            Lampa.Modal.close();
            Lampa.Notify.show('⚠️ Ошибка: ' + e.message, null, null, 3000);
        }
    }
})();
