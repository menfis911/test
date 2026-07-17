// DEBUG VERSION - показывает точную ошибку
(function() {
    'use strict';
    
    console.log('=== PLUGIN LOADED ===');
    
    function init() {
        console.log('=== PLUGIN INIT ===');
        
        Lampa.Listener.follow('full', function(event) {
            console.log('Full event type:', event.type);
            
            if (event.type !== 'complite') return;
            
            console.log('Event object:', event.object);
            console.log('Activity:', event.object.activity);
            console.log('Data:', event.object.data);
            
            setTimeout(function() {
                try {
                    var render = event.object.activity.render();
                    console.log('Render element:', render);
                    console.log('Render length:', render.length);
                    
                    var container = render.find('.full-start__buttons');
                    console.log('Container found:', container.length);
                    
                    if (!container.length) {
                        container = render.find('.full-start-new__buttons');
                        console.log('Alt container found:', container.length);
                    }
                    
                    if (!container.length) {
                        console.log('NO CONTAINER FOUND!');
                        return;
                    }
                    
                    if (container.find('.my-debug-btn').length) {
                        console.log('Button already exists');
                        return;
                    }
                    
                    // Создаём кнопку через нативный DOM
                    var btn = document.createElement('div');
                    btn.className = 'full-start__button selector my-debug-btn';
                    btn.style.cssText = 'background: #ff4444;';
                    btn.innerHTML = '<span>DEBUG</span>';
                    
                    console.log('Button created:', btn);
                    
                    // Добавляем в DOM
                    container[0].appendChild(btn);
                    console.log('Button appended to DOM');
                    
                    // Обработчик через Lampa.Controller (правильный способ!)
                    btn.addEventListener('hover:enter', function() {
                        console.log('hover:enter fired!');
                        try {
                            Lampa.Noty.show('DEBUG BUTTON WORKS!');
                        } catch(err) {
                            console.error('Noty error:', err);
                            alert('Error: ' + err.message);
                        }
                    });
                    
                    console.log('Event listener attached');
                    
                } catch(err) {
                    console.error('INIT ERROR:', err);
                    console.error('Stack:', err.stack);
                }
            }, 300);
        });
    }
    
    try {
        if (window.appready) {
            console.log('App already ready');
            init();
        } else {
            console.log('Waiting for app ready...');
            Lampa.Listener.follow('app', function(e) {
                console.log('App event:', e.type);
                if (e.type === 'ready') init();
            });
        }
    } catch(err) {
        console.error('STARTUP ERROR:', err);
    }
    
    console.log('=== PLUGIN END ===');
})();
