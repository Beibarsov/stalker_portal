/**
 * TV module.
 */

(function(){

    /* TV */
    function tv_constructor(){
        
        this.layer_name = 'tv';
        
        this.row_blocks  = ['number', 'fav', 'lock', 'archive', 'name', 'quality_high', 'quality_medium', 'quality_low','cur_playing'];
        
        this.load_params = {
            'type'   : 'itv',
            'action' : 'get_ordered_list'
        };
        
        this.preview_pos_map = [
            {"mode" : 576,  "xsize" : 320, "ysize" : 256, "x" : 350, "y" : 74},
            {"mode" : 720,  "xsize" : 569, "ysize" : 320, "x" : 622, "y" : 93},
            {"mode" : 1080, "xsize" : 854, "ysize" : 480, "x" : 933, "y" : 139},
            {"mode" : 480,  "xsize" : 300, "ysize" : 240, "x" : 350, "y" : 63}
        ];
        
        this.preview_pos = this.preview_pos_map[this.preview_pos_map.getIdxByVal("mode", parseInt(stb.video_mode))];
        
        this.superclass = ListLayer.prototype;
        
        this.sort_menu = {};
        
        this.view_menu = {};
        //this.fav_menu  = {};
        this.filter_menu = {};
        this.genres    = [];
        
        //this.last_ch_id = 0;
        
        this.quick_ch_switch = {"on" : false, "hide_to" : 3000};
        
        this.row_callback_timer;
        this.row_callback_timeout = 500;
        
        this.fav_manage_mode = false;
        
        this.password_input = new password_input({"parent" : this});
        this.password_input.bind();
        
        this._show = function(genre){
            
            _debug('tv._show', genre);
            
            genre = genre || this.genres[0];
            
            this.load_params['genre'] = genre.id;

            this.genre = genre;

            this.update_header_path([{"alias" : "genre", "item" : genre.title}]);
            
            this.sort_menu.action();
            
            this.show();
        };

        this.init = function(){
            this.superclass.init.call(this);

            if (stb.profile['tv_quality_filter']){
                /*for (var i=0; i<this.map.length; i++){
                    this.map[i].name_block.style.marginRight = '30px';
                }*/

                this.dom_obj.setAttribute("rel", "quality-filter");

                /*this.active_row.name_block.style.marginRight = '50px';*/
            }
        };
        
        this.show = function(do_not_load){
            _debug('tv.show', do_not_load);

            if(this.data_items && this.data_items[this.cur_row] && this.data_items[this.cur_row].id && stb.player.cur_media_item && this.data_items[this.cur_row].id == stb.player.cur_media_item.id){
                do_not_load = true;
            }else{
                do_not_load = false;
                if (this.genre && this.genre.hasOwnProperty('id')){
                    this.load_params['genre'] = this.genre.id;
                }
            }

            _debug('do_not_load', do_not_load);

            if (!do_not_load){
                this.cur_page = 0;
            }

            _debug('this.cur_page', this.cur_page);
            
            this.superclass.show.call(this, do_not_load);
            
            stb.clock.show();
            
            try{
                _debug('tv.cur_view', this.cur_view);
                
                if (this.cur_view == 'short'){
                    stb.SetTopWin(1);
                    stb.SetViewport(this.preview_pos.xsize, this.preview_pos.ysize, this.preview_pos.x, this.preview_pos.y);
                }else{
                    stb.SetTopWin(0);
                }
            }catch(e){
                _debug(e);
            }
        };
        
        this.hide = function(do_not_reset){
            _debug('tv.hide', do_not_reset);

            if (!do_not_reset){
                this.cur_page = 0;
            }
            
            this.short_epg_loader.stop();
            
            try{
                
                if (this.fav_manage_mode){
                    this.switch_fav_manage_mode();
                }
                
                this.sort_menu.on && this.sort_menu.hide && this.sort_menu.hide();
                this.view_menu.on && this.view_menu.hide && this.view_menu.hide();
                this.fav_menu.on && this.fav_menu.hide && this.fav_menu.hide();
                this.filter_menu.on && this.filter_menu.hide && this.filter_menu.hide();

                this.password_input.on && this.password_input.hide && this.password_input.hide();
                
                this.superclass.hide.call(this, do_not_reset);
            
                _debug('SetTopWin');
                
                if (this.quick_ch_switch.on){
                    this.cancel_quick_ch_switch();
                }
                
                if (!do_not_reset){
                    stb.player.stop();
                    //this.last_ch_id = 0;
                }
                
                stb.SetTopWin(0);
                stb.SetPIG(1, -1, -1, -1);
            }catch(e){
                _debug(e);
            }
        };
        
        this.clear_list = function(){
            _debug('tv.clear_list');
            
            this.superclass.clear_list.call(this);
            
            this.short_info_box.innerHTML = '';
        };
        
        this.bind = function(){
            this.superclass.bind.apply(this);
            
            //this.check_for_play.bind(key.OK, this);
            
            (function(){

                if (this.fav_manage_mode){
                    this.switch_fav_manage_mode();
                }else if (this.quick_ch_switch.on){
                    this.hide_quick_ch_switch();
                }else{
                    this.check_for_play();
                }
                
            }).bind(key.OK, this);
            
            (function(){

                if (single_module == this.layer_name){
                    return;
                }

                this.hide();
                main_menu.show();
            }).bind(key.MENU, this).bind(key.LEFT, this);
            
            (function(){
                if (module.epg_simple){
                    
                    if (stb.player.on){
                        stb.player.stop();
                    }
                    
                    //module.epg.ch_id = this.data_items[this.cur_row].id;
                    //module.epg.show();
                    
                    module.epg_simple.ch_id   = this.data_items[this.cur_row].id;
                    module.epg_simple.ch_name = this.data_items[this.cur_row].name;
                    module.epg_simple.channel = this.data_items[this.cur_row];
                    this.hide();
                    module.epg_simple.show();
                }
            }).bind(key.RIGHT, this).bind(key.EPG, this);
            
            (function(){
                if (module.epg){
                    if (stb.player.on){
                        stb.player.stop();
                    }
                    
                    module.epg.ch_id = this.data_items[this.cur_row].id;
                    this.hide();
                    module.epg.show();
                }
            }).bind(key.INFO, this);
            
            (function(){
                if (this.fav_manage_mode){
                    this.switch_fav_manage_mode();
                }else if (this.quick_ch_switch.on){
                    this.cancel_quick_ch_switch();
                }else{

                    if (single_module == this.layer_name){
                        if (window.referrer){
                            stb.player.stop();
                            window.location = window.referrer;
                        }else{
                            this.check_for_play();
                        }

                        return;
                    }

                    this.hide();
                    main_menu.show();
                }
            }).bind(key.EXIT, this);
            
            this.show_quick_ch_switch.bind(key.NUM1, this, 1);
            this.show_quick_ch_switch.bind(key.NUM2, this, 2);
            this.show_quick_ch_switch.bind(key.NUM3, this, 3);
            this.show_quick_ch_switch.bind(key.NUM4, this, 4);
            this.show_quick_ch_switch.bind(key.NUM5, this, 5);
            this.show_quick_ch_switch.bind(key.NUM6, this, 6);
            this.show_quick_ch_switch.bind(key.NUM7, this, 7);
            this.show_quick_ch_switch.bind(key.NUM8, this, 8);
            this.show_quick_ch_switch.bind(key.NUM9, this, 9);
            this.show_quick_ch_switch.bind(key.NUM0, this, 0);
            
            (function(){
                if (this.quick_ch_switch.on){
                    this.del_quick_go_ch();
                }
            }).bind(key.BACK, this);
            
            
            this.shift_row.bind(key.CHANNEL_PREV, this, -1);
            this.shift_row.bind(key.CHANNEL_NEXT, this, 1);

            this.add_to_censored_check.bind(key.APP, this);
        };

        this.add_to_censored_check = function(){
            _debug('tv.add_to_censored_check');

            var self = this;

            this.password_input.callback = function(){
                self.add_del_censored();
            };

            this.password_input.show();
        };

        this.add_del_censored = function(){
            _debug('tv.add_del_censored');

            if (this.data_items[this.cur_row].lock == 1){
                this.del_from_censored(this.data_items[this.cur_row].id);
            }else{
                this.add_to_censored(this.data_items[this.cur_row].id);
            }
        };

        this.add_to_censored = function(ch_id){
            _debug('tv.add_to_censored', ch_id);

            var cur_item = this.data_items[this.cur_row];
            var cur_row  = this.cur_row;

            var self = this;

            stb.load(
                {
                    "type"   : "itv",
                    "action" : "add_to_censored",
                    "ch_id"  : ch_id
                },
                function(result){
                    _debug('add_to_censored result', result);

                    if (result){
                        cur_item.lock = 1;
                        self.map[cur_row].lock_block.show();

                        if (self.cur_row == cur_row){
                            self.active_row.lock_block.show();
                        }

                        var idx = stb.player.channels.getIdxByVal("id", ch_id);
                        if (idx !== null){
                            //stb.player.channels[idx].lock = 1;
                            stb.player.channels.splice(idx, 1);
                        }
                    }
                },
                this
            );
        };

        this.del_from_censored = function(ch_id){
            _debug('tv.del_from_censored', ch_id);

            var cur_item = this.data_items[this.cur_row];
            var cur_row  = this.cur_row;

            var self = this;
            
            stb.load(
                {
                    "type"   : "itv",
                    "action" : "del_from_censored",
                    "ch_id"  : ch_id
                },
                function(result){
                    _debug('del_from_censored result', result);

                    if (result){
                        cur_item.lock = 0;
                        /*cur_item.lock_block.hide();*/
                        self.map[cur_row].lock_block.hide();

                        if (self.cur_row == cur_row){
                            self.active_row.lock_block.hide();
                        }

                        stb.load_channels();
                    }
                },
                this
            );
        };
        
        this.check_for_play = function(){
            _debug('tv.check_for_play');
            
            _debug('lock', this.data_items[this.cur_row].lock);
            
            if(!this.data_items[this.cur_row].open){
                stb.notice.show(word['msg_channel_not_available']);
                return;
            }
            
            if (this.data_items[this.cur_row].lock){
                var self = this;
                
                this.password_input.callback = function(){
                    self.play();
                };
                
                this.password_input.show();
            }else{
                this.play();
            }
        };
        
        this.play = function(){
            _debug('tv.play');
            
            _debug('this.data_items[this.cur_row]', this.data_items[this.cur_row]);
            _debug('empty(this.data_items[this.cur_row]', empty(this.data_items[this.cur_row]));
            
            if (empty(this.data_items[this.cur_row])){
                return;
            }
            
            /*this.hide(true);
            
            stb.player.prev_layer = this;*/
            
            _debug('stb.player.on', stb.player.on);
            
            if (!stb.player.on){
                /*if (this.cur_view == 'short'){
                    stb.player.need_show_info = 0;
                }else{
                    stb.player.need_show_info = 1;
                }*/
                
                //this.last_ch_id = this.data_items[this.cur_row].id;
                
                if (this.cur_view != 'short'){
                    this.hide(true);
            
                    stb.player.prev_layer = this;
                    
                    stb.player.need_show_info = 1;
                    this._play_now(this.data_items[this.cur_row]);
                }else{
                    //this.show_info(this.cur_media_item);
                }
            }else{
                if (this.cur_view == 'short'){
                    this.hide(true);
                
                    stb.player.prev_layer = this;
                }
            }
        };
        
        this.init_sort_menu = function(map, options){
            this.sort_menu = new bottom_menu(this, options);
            this.sort_menu.init(map);
            this.sort_menu.bind();
        };
        
        this.sort_menu_switcher = function(){
            
            if (this.fav_manage_mode){
                return;
            }
            
            if (this.sort_menu && this.sort_menu.on){
                this.sort_menu.hide();
            }else{
                this.sort_menu.show();
            }
        };
        
        this.init_view_menu = function(map, options){
            this.view_menu = new bottom_menu(this, options);
            this.view_menu.init(map);
            this.view_menu.bind();
        };
        
        this.view_switcher = function(){
            
            if (this.fav_manage_mode){
                return;
            }
            
            if (this.view_menu && this.view_menu.on){
                this.view_menu.hide();
            }else{
                this.view_menu.show();
            }
        };

        this.init_fav_menu = function(map, options){
            this.fav_menu = new bottom_menu(this, options);
            this.fav_menu.init(map);
            this.fav_menu.bind();
        };

        this.fav_menu_switcher = function(){
            
            if (this.fav_menu && this.fav_menu.on){
                this.fav_menu.hide();
            }else{
                this.fav_menu.show();
            }
        };

        this.init_filter_menu = function(map, options){
            this.filter_menu = new bottom_menu(this, options);
            this.filter_menu.init(map);
            this.filter_menu.bind();
        };

        this.filter_switcher = function(){
            if (this.filter_menu && this.filter_menu.on){
                this.filter_menu.hide();
            }else{
                this.filter_menu.show();
            }
        };
        
        this.set_wide_container = function(){
            
            if (this.cur_view == 'short'){
                stb.player.stop();
            }
            
            this.superclass.set_wide_container.apply(this);

            if (this.load_params.fav){
                this.color_buttons.get('blue').enable();
                this.fav_menu && this.fav_menu.enable_by_name("fav_manage");
            }

            try{
                stb.SetTopWin(0);
                stb.SetPIG(1, -1, -1, -1);
            }catch(e){
                _debug(e);
            }
        };
        
        this.set_short_container = function(){
            _debug('tv.set_short_container');
            
            this.superclass.set_short_container.apply(this);

            if (!stb.profile['tv_quality_filter']){
                this.color_buttons && this.color_buttons.get('blue').disable();
            }else{
                this.fav_menu && this.fav_menu.disable_by_name("fav_manage");
            }
            
            try{
                _debug('this.preview_pos', this.preview_pos);
                stb.SetTopWin(1);
                stb.SetViewport(this.preview_pos.xsize, this.preview_pos.ysize, this.preview_pos.x, this.preview_pos.y);
            }catch(e){
                _debug(e);
            }
            
            this.fill_short_info(this.data_items[this.cur_row]);
            
            _debug('this.loading', this.loading);
            
            if (this.data_items && this.data_items[this.cur_row] && !this.loading){
                stb.player.need_show_info = 0;
                this._play_now(this.data_items[this.cur_row]);
            }
            
            // set active list w/ info item
            if (this.view_menu && this.view_menu.set_passive_row){
                this.view_menu.set_passive_row();
                this.view_menu.cur_row_idx = 0;
                this.view_menu.set_active_row();
            }
        };
        
        this.init_short_info = function(){
            this.info_box = create_block_element('', this.main_container);
            
            this.short_info_box = create_block_element('tv_timetable', this.info_box);
            this.preview_box = create_block_element('tv_prev_window', this.info_box);
            this.clock_box = create_block_element('tv_clock', this.info_box);
        };
        
        this.fill_list = function(data){
            _debug('tv.fill_list');

            if (this.fav_manage_mode && !empty(this.cur_row_data)){

                var idx = 0;

                if (this.page_dir < 0){
                    idx = data.length - 1;
                }

                var cur_item_id = this.cur_row_data.id;
                var next_item_id = data[idx].id;

                var cur_row_fav_idx = stb.player.fav_channels_ids.indexOf(cur_item_id);
                var next_row_fav_idx = stb.player.fav_channels_ids.indexOf(next_item_id);

                stb.player.fav_channels_ids[cur_row_fav_idx]  = next_item_id;
                stb.player.fav_channels_ids[next_row_fav_idx] = cur_item_id;

                this.cur_row_data.number = data[idx].number;

                data[idx] = this.cur_row_data;
            }
            
            this.load_params['from_ch_id'] = 0;
            
            this.superclass.fill_list.call(this, data);
            
            if (this.cur_view == 'short'){
                this.fill_short_info(this.data_items[this.cur_row])
            }
        };
        
        this.fill_short_info = function(item){
            _debug('tv.fill_short_info');
            
            if (item && !item.open){
                this.short_info_box.innerHTML = '<span class="current">' + word['msg_channel_not_available'] + '</span>';
            }else if (item && item.epg){
                
                //this.fill_short_epg(item.epg);
                this.short_info_box.innerHTML = '';
                this.short_epg_loader.start();
            }
        };
        
        this.fill_short_epg = function(epg){
            
            var class_name = '';
            var txt = '';
            
            for (var i=0; i<epg.length; i++){
                
                if (i == 0){
                    class_name = 'current';
                }else{
                    class_name = '';
                }

                txt += '<div class="mark_memo" style="display:' + ((!!epg[i].mark_memo) ? 'block' : 'none') + '"></div>';
                txt += '<div class="dummy_mark_memo" style="display:' + ((!!epg[i].mark_memo) ? 'none' : 'block') + '"></div>';

                txt += '<span class="time">' + epg[i].t_time + ' - </span><span class="' + class_name + '">' + epg[i].name + '</span><br>';
            }
            
            this.short_info_box.innerHTML = txt;
        };
        
        this.shift_row_callback = function(item){
            
            _debug('tv.shift_row_callback', item);
            
            if (empty(item)){
                return;
            }

            _debug('this.data_items[this.cur_row].id', this.data_items[this.cur_row].id);
            _debug('stb.player.cur_media_item.id', stb.player.cur_media_item.id);
            _debug('stb.player.on', stb.player.on);

            if(this.data_items[this.cur_row].id == stb.player.cur_media_item.id && stb.player.on){
                return;
            }
            
            window.clearTimeout(this.row_callback_timer);
            
            var self = this;

            _debug('before set timeout');
            this.row_callback_timer = window.setTimeout(function(){

                _debug('row_callback');
                if (!self.on){
                    return;
                }
                
                self.fill_short_info(item);
                
                if (item.open){

                    if (item.lock){
                        self.password_input.callback = function(){
                            stb.player.need_show_info = 0;
                            stb.player.prev_layer = self;
                            self._play_now(item);
                        };

                        self.password_input.show();
                    }else{
                        stb.player.need_show_info = 0;
                        stb.player.prev_layer = self;
                        self._play_now(item);
                    }
                }else{
                    stb.player.stop();
                }
                
            },
            this.row_callback_timeout);

            _debug('this.row_callback_timeout', this.row_callback_timeout);
            _debug('after set timeout');
        };

        this._play_now = function(item){
            _debug('tv._play_now', item);

            if(item.id == stb.player.cur_media_item.id && stb.player.on){
                return;
            }

            if (parseInt(item.use_http_tmp_link) == 1){

                stb.player.on_create_link = function(result){
                    _debug('tv.on_create_link', result);

                    if (result.error == 'limit'){
                        stb.notice.show(word['player_limit_notice']);
                    }else if(result.error == 'nothing_to_play'){
                        stb.notice.show(word['player_file_missing']);
                    }else if(result.error == 'link_fault'){
                        stb.notice.show(word['player_server_error']);
                    }else{
                        //if (self.info.on){
                        //    self.info.hide();
                        //} 

                        //self.hide(true);

                        //stb.player.prev_layer = self;
                        //stb.player.need_show_info = 1;
                        stb.player.play_now(result.cmd);
                    }
                }
            }
            
            stb.player.play(item);
        };
        
        this.add_to_fav = function(){
            _debug('tv.add_to_fav');
            
            _debug('this.player.fav_channels before', stb.player.fav_channels_ids);
            
            stb.player.fav_channels_ids.push(this.data_items[this.cur_row].id);
            
            _debug('this.player.fav_channels after', stb.player.fav_channels_ids);
            
            this.data_items[this.cur_row].fav = 1;
            
            this.map[this.cur_row].fav_block.show();
            this.active_row.fav_block.show();
            
            this.data_items[this.cur_row].number = stb.player.fav_channels.length + 1;
            
            stb.player.fav_channels.push(this.data_items[this.cur_row]);
            
            stb.player.save_fav_ids();
        };
        
        this.del_from_fav = function(){
            _debug('tv.del_from_fav');
            
            _debug('this.player.fav_channels before', stb.player.fav_channels_ids);
            
            var fav_idx = stb.player.fav_channels_ids.indexOf(this.data_items[this.cur_row].id);
            
            var removed_idx = stb.player.fav_channels_ids.splice(fav_idx, 1);
            
            _debug('removed_idx', removed_idx);
            
            _debug('this.player.fav_channels after', stb.player.fav_channels_ids);
            
            this.data_items[this.cur_row].fav = 0;
            
            this.map[this.cur_row].fav_block.hide();
            this.active_row.fav_block.hide();
            
            var fav_ch_idx = stb.player.fav_channels.getIdxByVal('id', this.data_items[this.cur_row].id);
            
            if (fav_ch_idx !== null){
                stb.player.fav_channels.splice(fav_ch_idx, 1);
            }
            
            stb.player.save_fav_ids();
        };
        
        this.add_del_fav = function(){
            _debug('tv.add_del_fav');
            
            if (this.fav_manage_mode){
                return;
            }
            
            //if (this.load_params.fav == true){
                //return;
            //}
            
            if(this.data_items[this.cur_row].fav){
                this.del_from_fav();
            }else{
                this.add_to_fav();
            }
        };
        
        this.set_active_row = function(num){
            _debug('tv.set_active_row');
            
            this.short_epg_loader.stop();
            
            this.superclass.set_active_row.call(this, num);
            
            //this.handling_block(this.data_items[num].number, this.active_row, 'number');
        };
        
        this.shift_row = function(dir){
            
            if (this.fav_manage_mode){
                var cur_data_items = this.data_items.clone();
                //var cur_row_data = this.data_items[this.cur_row].clone();
                var cur_row_data = this.data_items[this.cur_row];
                var cur_row_num  = this.cur_row;
                var cur_number   = cur_row_data.number;
                var cur_item_id  = cur_row_data.id;
                
                var cur_row_fav_idx = stb.player.fav_channels_ids.indexOf(cur_item_id);
                
                _debug('stb.player.fav_channels_ids before', stb.player.fav_channels_ids);
                
            }
            
            this.superclass.shift_row.call(this, dir);
            
            if (this.fav_manage_mode){
    
                var next_row_data = this.data_items[this.cur_row];
                var next_number   = next_row_data.number;
                var next_item_id  = this.data_items[this.cur_row].id;
                
                _debug('cur_number', cur_number);
                
                _debug('next_row_data.number before', next_row_data.number);
                
                next_row_data.number = cur_number;
                cur_row_data.number  = next_number;
                
                _debug('next_row_data.number after', next_row_data.number);
                
                var next_row_fav_idx = stb.player.fav_channels_ids.indexOf(next_item_id);
                
                stb.player.fav_channels_ids[cur_row_fav_idx]  = next_item_id;
                stb.player.fav_channels_ids[next_row_fav_idx] = cur_item_id;
                
                this.data_items[this.cur_row] = cur_row_data;
                this.data_items[cur_row_num] = next_row_data;
                                
                _debug('stb.player.fav_channels_ids after', stb.player.fav_channels_ids);
                
                for (var j=0; j<this.row_blocks.length; j++){
                    this.handling_block(cur_row_data[this.row_blocks[j]], this.map[this.cur_row], this.row_blocks[j]);
                    
                    this.handling_block(next_row_data[this.row_blocks[j]], this.map[cur_row_num], this.row_blocks[j]);
                }
            }
        };
        
        this.shift_page = function(dir){
            
            if (this.fav_manage_mode){
                stb.player.save_fav_ids();

                this.cur_row_data = this.data_items[this.cur_row];
            }
            
            this.superclass.shift_page.call(this, dir);
        };
        
        this.switch_fav_manage_mode = function(){
            _debug('tv.switch_fav_manage_mode');
            
            if (this.load_params.fav != true || this.cur_view != 'wide'){
                return;
            }
            
            _debug('typeof(tv.fav_manage_mode)', typeof(this.fav_manage_mode));
            _debug('tv.fav_manage_mode before', this.fav_manage_mode);
            
            if (this.fav_manage_mode){
                stb.player.save_fav_ids();
                this.active_row['row'].setClass('active_row_bg');
                
                /*this.color_buttons[this.color_buttons.getIdxByVal('color', 'red')].text_obj.delClass();
                this.color_buttons[this.color_buttons.getIdxByVal('color', 'green')].text_obj.delClass();
                this.color_buttons[this.color_buttons.getIdxByVal('color', 'yellow')].text_obj.delClass();*/
                this.color_buttons.get('red')   .enable();
                this.color_buttons.get('green') .enable();
                this.color_buttons.get('yellow').enable();

                if (stb.profile['tv_quality_filter']){
                    this.color_buttons.get('blue').enable();
                }
                
            }else{
                this.active_row['row'].setClass('moved_active_row_bg');
                
                /*this.color_buttons[this.color_buttons.getIdxByVal('color', 'red')].text_obj.setClass('disable_color_btn_text');
                this.color_buttons[this.color_buttons.getIdxByVal('color', 'green')].text_obj.setClass('disable_color_btn_text');
                this.color_buttons[this.color_buttons.getIdxByVal('color', 'yellow')].text_obj.setClass('disable_color_btn_text');*/

                this.color_buttons.get('red')   .disable();
                this.color_buttons.get('green') .disable();
                this.color_buttons.get('yellow').disable();

                if (stb.profile['tv_quality_filter']){
                    this.color_buttons.get('blue').disable();
                }
            }
            
            this.fav_manage_mode = !this.fav_manage_mode;
            
            _debug('tv.fav_manage_mode after', this.fav_manage_mode);
        };
        
        this.init_quick_ch_switch = function(){
            _debug('tv.init_quick_ch_switch');
            
            this.quick_ch_switch.dom_obj = create_block_element('quick_ch_switch tv_preview_quick_ch_switch');
            
            //this.quick_ch_switch.dom_obj.moveY(300);
            
            this.quick_ch_switch.input = create_block_element('quick_ch_input', this.quick_ch_switch.dom_obj);
            
            this.quick_ch_switch.dom_obj.hide();
        };
        
        this.show_quick_ch_switch = function(num){
            _debug('tv.show_quick_ch_switch');
            
            if (this.cur_view != 'short'){
                return;
            }
            
            if (!this.quick_ch_switch.on){
                this.quick_ch_switch.dom_obj.show();
                this.quick_ch_switch.on = true;
            }
            
            if (this.quick_ch_switch.input.innerHTML.length < 3){
                if (this.quick_ch_switch.input.innerHTML.length == 0 && num == 0){
                    
                }else{
                    this.quick_ch_switch.input.innerHTML = this.quick_ch_switch.input.innerHTML + '' + num;
                }
            }
            
            this.t_hide_quick_ch_switch();
        };
        
        this.quick_go_to_ch = function(){
            _debug('tv.quick_go_to_ch');
            
            var ch_num = parseInt(this.quick_ch_switch.input.innerHTML);
            
            _debug('ch_num', ch_num);
            
            var item = {};
            
            if (stb.user.fav_itv_on){
                
                stb.player.f_ch_idx = stb.player.fav_channels.getIdxByVal('number', ch_num);
                
                _debug('stb.player.f_ch_idx', stb.player.f_ch_idx);
                
                if (stb.player.f_ch_idx >= 0){
                    
                }else{
                    stb.player.f_ch_idx = 0;
                }
                
                _debug('stb.player.f_ch_idx', stb.player.f_ch_idx);
                
                item = stb.player.fav_channels[stb.player.f_ch_idx];
                
                _debug('item', item);
                
            }else{
                
                stb.player.ch_idx = stb.player.channels.getIdxByVal('number', ch_num);
                
                _debug('stb.player.ch_idx', stb.player.ch_idx);
                
                if (stb.player.ch_idx >= 0){
                    
                }else{
                    stb.player.ch_idx = 0;
                }
                
                _debug('stb.player.ch_idx', stb.player.ch_idx);
                
                item = stb.player.channels[stb.player.ch_idx];
                
                _debug('item', item);
            }
            
            if (!empty(item)){
                if (this.cur_view == 'short'){
                    
                    var self = this;
                    
                    stb.player.send_last_tv_id_callback = function(){self.load_data.apply(self)};
                    stb.player.need_show_info = 0;
                    this._play_now(item);
                }else{
                    stb.player.send_last_tv_id(item.id);
                }
                
                
                this.cur_page = 0;
                //this.load_data();
            }
        };
        
        this.del_quick_go_ch = function(){
            _debug('tv.del_quick_go_ch');
            
            if (!this.quick_ch_switch.on){
                return;
            }
            
            this.t_hide_quick_ch_switch();
            
            this.quick_ch_switch.input.innerHTML = this.quick_ch_switch.input.innerHTML.substr(0, this.quick_ch_switch.input.innerHTML.length - 1);
            
            //this.quick_ch_switch.input.innerHTML = ch_hum;
        };
        
        this.t_hide_quick_ch_switch = function(){
            _debug('tv.t_hide_quick_ch_switch');
            
            window.clearTimeout(this.quick_ch_switch.hide_timer);
            
            var self = this;
            
            this.quick_ch_switch.hide_timer = window.setTimeout(function(){
                
                self.hide_quick_ch_switch();
                
            }, this.quick_ch_switch.hide_to);
        };
        
        this.hide_quick_ch_switch = function(){
            _debug('tv.hide_quick_ch_switch');
            
            if (!this.quick_ch_switch.on){
                return;
            }
            
            this.quick_go_to_ch();
            
            this.fill_short_info(this.data_items[this.cur_row]);
            
            this.cancel_quick_ch_switch();
        };
        
        this.cancel_quick_ch_switch = function(){
            _debug('tv.cancel_quick_ch_switch');
            
            window.clearTimeout(this.quick_ch_switch.hide_timer);
            
            this.quick_ch_switch.dom_obj.hide();
            this.quick_ch_switch.on = false;
            
            this.quick_ch_switch.input.innerHTML = '';
        };
        
        this.short_epg_loader = {
            
            parent : {},
            
            start : function(){
                _debug('tv.short_epg_loader.start');
                
                var self = this;
                
                this.load();
                
                window.clearInterval(this.timer);
                
                this.timer = window.setInterval(function(){self.load()}, 5*60*1000);
            },
            
            stop : function(){
                _debug('tv.short_epg_loader.stop');
                
                window.clearInterval(this.timer);
            },
            
            load : function(){
                _debug('tv.short_epg_loader.load');
                
                if (this.parent && this.parent.data_items && this.parent.cur_row >= 0){
                
                    stb.load(
                        {
                            "type"   : "itv",
                            "action" : "get_short_epg",
                            "ch_id"  : this.parent.data_items[this.parent.cur_row].id
                        },
                        
                        function(result){
                            _debug('tv.short_epg_loader.load callback');
                            
                            this.fill(result);
                        },
                        
                        this
                    )
                }
            },
            
            fill : function(data){
                _debug('tv.short_epg_loader.fill', data);
                
                this.parent.fill_short_epg(data);
            }
        };
    }
    
    tv_constructor.prototype = new ListLayer();
    
    var tv = new tv_constructor();
    
    tv.bind();
    tv.init();
    
    tv.init_short_info();
    
    tv.init_quick_ch_switch();
    
    tv.short_epg_loader.parent = tv;
    
    //tv.set_wide_container();
    //tv.set_short_container();

    if (single_module != 'tv'){
        tv.init_left_ear(word['ears_back']);
    }

    tv.init_right_ear(word['ears_tv_guide']);
    
    var color_buttons_map = [
        {"label" : word['tv_view'], "cmd" : tv.view_switcher},
        {"label" : word['tv_sort'], "cmd" : tv.sort_menu_switcher}
    ];

    if (stb.profile['tv_quality_filter']){
        color_buttons_map.push({"label" : word['tv_favorite'], "cmd" : tv.fav_menu_switcher});
        color_buttons_map.push({"label" : get_word('tv_quality'), "cmd" : tv.filter_switcher});
    }else{
        color_buttons_map.push({"label" : word['tv_favorite'], "cmd" : tv.add_del_fav});
        color_buttons_map.push({"label" : get_word('tv_move'), "cmd" : tv.switch_fav_manage_mode});
    }

    tv.init_color_buttons(color_buttons_map);

    var sort_menu_map = [
        {
            "label" : word['tv_by_number'],
            "cmd" : function(){

                this.parent.load_params.fav = false;
                stb.user.fav_itv_on = 0;
                stb.player.set_fav_status();
                this.parent.load_params.sortby = 'number';
                if (!stb.profile['tv_quality_filter']){
                    this.parent.color_buttons.get('blue').disable();
                }else{
                    this.parent.fav_menu && this.parent.fav_menu.disable_by_name("fav_manage");
                }
            }
        },
        {
            "label" : word['tv_by_title'],
            "cmd" : function(){

                this.parent.load_params.fav = false;
                stb.user.fav_itv_on = 0;
                stb.player.set_fav_status();
                this.parent.load_params.sortby = 'name';
                if (!stb.profile['tv_quality_filter']){
                    this.parent.color_buttons.get('blue').disable();
                }else{
                    this.parent.fav_menu && this.parent.fav_menu.disable_by_name("fav_manage");
                }
            }
        },
        {
            "label"   : word['tv_only_favorite'],
            "cmd" : function(){

                this.parent.load_params.sortby = 'fav';
                stb.user.fav_itv_on = 1;
                stb.player.set_fav_status();
                this.parent.load_params.fav = true;

                if (this.parent.cur_view == 'wide'){
                    this.parent.color_buttons.get('blue').enable();
                }else{
                    if (!stb.profile['tv_quality_filter']){
                        this.parent.color_buttons.get('blue').disable();
                    }else{
                        this.parent.fav_menu && this.parent.fav_menu.disable_by_name("fav_manage");
                    }
                }
            }
        }
    ];

    if (stb.profile['tv_quality_filter']){
        var filter_menu_map = [
            {
                "label" : get_word('tv_quality_low'),
                "type"  : "checkbox",
                "name"  : "tv_quality_low",
                "group" : "tv_quality",
                "cmd"   : function(){
                    this.parent.load_params.quality = "low";
                }
            },
            {
                "label" : get_word('tv_quality_medium'),
                "type"  : "checkbox",
                "name"  : "tv_quality_medium",
                "group" : "tv_quality",
                "cmd"   : function(){
                    this.parent.load_params.quality = "medium";
                }
            },
            {
                "label" : get_word('tv_quality_high'),
                "type"  : "checkbox",
                "name"  : "tv_quality_high",
                "group" : "tv_quality",
                "cmd"   : function(){
                    this.parent.load_params.quality = "high";
                }
            }
        ];

        tv.init_filter_menu(
            filter_menu_map,
            {
                "color" : "blue",
                "need_update_header" : false
            }
        );
    }
    
    tv.init_sort_menu(
        sort_menu_map,
        {
            "offset_x" : 217,
            "color"    : "green"
        }
    );
    
    tv.init_view_menu(
        [
            {"label" : word['tv_list_w_info'], "cmd" : function(){this.parent.set_short_container()}},
            {"label" : word['tv_list'], "cmd" : function(){this.parent.set_wide_container()}}
        ],
        {
            "offset_x" : 27,
            "color"    : "red",
            "need_reset_load_data" : false,
            "need_update_header"   : false
        }
    );
    
    _debug('stb.user.fav_itv_on', stb.user.fav_itv_on);
    
    if(stb.user.fav_itv_on){
        tv.sort_menu.set_passive_row();
        tv.sort_menu.cur_row_idx = 2;
        tv.sort_menu.set_active_row();
        tv.sort_menu.action();
    }

    _debug('stb.profile[tv_quality_filter]', stb.profile['tv_quality_filter']);
    _debug('stb.profile[tv_quality]', stb.profile['tv_quality']);

    if (stb.profile['tv_quality_filter']){
        tv.filter_menu.check_by_name('tv_quality_'+stb.profile['tv_quality']);
    }

    tv.init_fav_menu(
        [
            {
                "label" : get_word('tv_move'),
                "name"  : "fav_manage",
                "cmd" : function(){
                    tv.switch_fav_manage_mode();
                }
            },
            {
                "label" : get_word('tv_fav_add') + '/' + get_word('tv_fav_del'),
                "cmd" : function(){
                    tv.add_del_fav();
                }
            }
        ],
        {
            "color"    : "yellow",
            "need_reset_load_data" : false,
            "need_update_header" : false
        }
        
    );

    tv.view_menu.dependency  = [tv.sort_menu, tv.fav_menu, tv.filter_menu];

    tv.sort_menu.dependency  = [tv.view_menu, tv.fav_menu, tv.filter_menu];

    tv.fav_menu.dependency  = [tv.view_menu, tv.sort_menu, tv.filter_menu];

    if (tv.filter_menu.hasOwnProperty('dependency')){
        tv.filter_menu.dependency  = [tv.view_menu, tv.sort_menu, tv.fav_menu];
    }

    tv.set_short_container();
    
    tv.init_header_path(word['tv_title']);
    
    tv.hide();
    
    module.tv = tv;
    
    /* END TV */
    
    /* Integrate tv in main menu */
    
    stb.load(
        {
            "type"   : "itv",
            "action" : "get_genres"
        },
        function(result){
            _debug('callback genres');
            
            var genres = result;
            
            module.tv.genres = genres;
            
            var map = [];
    
            for(var i=0; i<genres.length; i++){
                map.push(
                
                    {
                        "title" : genres[i].title,
                        "cmd"   : (function(genre){
                            
                            
                            return function(){
                                _debug('genre.id', genre.id);
                            
                                main_menu.hide();
                                module.tv._show(genre);
                            }
                            
                        })(genres[i])
                    }
                );
            }
            
            
            main_menu.add(word['tv_title'], map, 'mm_ico_tv.png', '', module.tv);
            
            loader.next();
        }
    )

})();

//loader.next();