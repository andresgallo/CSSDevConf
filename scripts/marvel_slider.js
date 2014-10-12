/*jshint:false */


/**
 * PwrSldr
 * --------------
 * A responsive, touch compatible and flexible content slider. Uses hardware acceleration whenever possible. Requires
 * jQuery, hammer.js (for touch controls), and juggernaut.js.
 * @author Marc Weiner
 */


//INSTANCE SPECIFIC SETUP
var PwrSldr = function( opts ){
    "use strict";
    var myObj = this;

    /*** properties ***/
    var options = {
        $el: opts.el, //the slider
        $ul: null, //ul
        $wrapper: null, //.pwrSldr_wrapper (to hide scrollbars)
        $container: null, //.pwrSldr_container
        $lis: [],

        num_items: 0,
        cur_item: 0,
        prev_item: -1,

        is_paginated: false,
        items_per_page: 1,
        num_pages: 0,

        prev_page: -1,
        cur_page: 0,

        numItemChanges: 0,

        page_width: 0,

        intervals: {
            draw: null,
            play: null,
            pause:null
        },

        ready: false, //is true if already initialized and onReady has fired
        stopped: false,
        last_known_el_width: 0,

        opts: opts
    };
    this.model = new Juggernaut.OO.Models.PwrSldr( options, this );
    this.model.init( options, this );
    this._vars = this.model.attributes;

    //Initialize. Waits 400ms for things to load/render before initializing for better performance.
    setTimeout(function(){
        myObj.__init.call(myObj);
    }, 400);
};

//Object oriented namespacing and basics, to be moved
Juggernaut.OO = {};
Juggernaut.OO.Models = {};
Juggernaut.OO.Views = {};

//Juggernaut.OO.Models.Model = function(){};

Juggernaut.OO.Models.protoModel = function( options, view ) {
    this.init = function( options, view ) {
        this.attributes = options;
        this.view = view;
        this._events = {};
        this._oneEvents = {};
    };

    this.get = function( key ) {
        return this.attributes[ key ];
    };

    this.set = function( key, value, silent ) {
        if( this.attributes[ key ] !== value ) {
            this.attributes[ key ] = value;
            if( !silent ) {
                this.trigger( key + ':updated' );
            }
        }
    };

    this.setBatch = function( obj, silent ) {
        for( var key in obj ) {
            this.set( key, obj[ key ], silent );
        }
    };

    this.on = function( name, callback, context, data, once ) {
        if( !context ) context = this;
        var storage;
        if( once ) {
            storage = this._oneEvents;
        } else {
            storage = this._events;
        }
        var hasListener = false;
        if( !storage[ name ] ) {
            storage[ name ] = [];
        } else {
            var listeners = storage[ name ];
            for ( var i = listeners.length - 1; i >= 0; i-- ) {
                var lCheck = listeners[ i ];
                if( lCheck.callback === callback && lCheck.context === context ) {
                    hasListener = true;
                }
            }
        }

        if( callback && !hasListener ) {
            var listener = {
                callback: callback,
                context: context
            };
            if( data ) {
                listener.data = data;
            }
           storage[ name ].push( listener );
        }
    };

    this.one = function( name, callback, context, data ) {
        this.on( name, callback, context, data, true );
    };

    this.off = function( name, callback, context ) {
        var listeners = this._events[ name ];
        for ( var i = listeners.length - 1; i >= 0; i-- ) {
            listener = listeners[ i ];
            if( listener.callback === callback && listener.context === context ){
                listeners.splice( i, 1 );
            }
        }
    };

    this.trigger = function( name ) {
        //console.log( 'pwrSldr.js/trigger:\n\t triggered: ' + name );
        this._doCallback( this._events[ name ] );
        this._doCallback( this._oneEvents[ name ] );
        if( this._oneEvents[ name ] ) {
            delete this._oneEvents[ name ];
        }
    };

    this._doCallback = function( listeners ) {
        if( listeners ) {
            for ( var i = listeners.length - 1; i >= 0; i-- ) {
                var listener = listeners[ i ];
                listener.callback.call( listener.context, listener );
            }
        }
    };
};
Juggernaut.OO.Models.Model = function(){};
Juggernaut.OO.Models.Model.prototype = new Juggernaut.OO.Models.protoModel();
//Model
Juggernaut.OO.Models.PwrSldr = function( options ) {
    this.itemPositions = [];

    this._increaseNumItemChanges = function() {
        //console.log( 'pwrSldr.js/_increaseNumItemChanges' );
        var numShown = this.get( 'numItemChanges' );
        this.set( 'numItemChanges', numShown + 1 );
    };
    /**
     * Returns the current item number. The current item is the first one that appears completely within the current
     * slider position. This is a somewhat expensive function, so it should only be run when needed.
     */
    this.getCurItem = function(){
        if( this.getOpt( 'pagination' ) == 'scroll' ) {
            return this.get( 'cur_page' ) * this.get( 'items_per_page' );
        }
        var items = $.makeArray( this.get( '$lis' ) );
        var item;
        for(var i=0; i<items.length; i++){
            item = $(items[i]);
            if(item.position().left >= this.get( '$el' ).scrollLeft()){
                return this.get( '$lis' ).index(item);
            }
        }
        return 0;
    };

    /**
     * Gets the current page in view. Will return a float if the page is partially in view.
     * @return {Number}
     */
    this.getCurPage = function(){
        var curPage;
        if( this.getOpt( 'pagination' ) == 'scroll' ){
            curPage = this.get( 'cur_page' );
        } else {
            curPage = this.get( '$el' ).scrollLeft() / this.get( 'page_width' );
        }
        return curPage;
    };

    this.getOpt = function( key ) {
        return this.get( 'opts' )[ key ];
    };

    this.setOpts = function( obj ) {
        for( var key in obj ) {
            this.attributes.opts[ key ] = obj[ key ];
        }
    };

    this.setItemPosition = function( item, pos ) {
        this.itemPositions[ item ] = pos;
    };

    this.getItemPosition = function( item, pos ) {
        var itemPosition = this.itemPositions[ item ];
        if( !itemPosition && itemPosition !== 0 ) {
            itemPosition = 0; //Need logic and stuff
        }
        return itemPosition;
    };

    this.goInDirection = function( direction, offset ) {
        if( !this.get( 'isInfiniteScrolling' ) && !this.get( 'itemIsChanging' ) ) {
            this.set( 'direction', direction );
            var isPaginated = this.get( 'is_paginated' );

            var curItem = this.getCurItem();
            var numItems = this.get( 'num_items' );
            var itemsPerPage = this.get( 'items_per_page' );
            var curPage = this.getCurPage();
            var numPages = this.get( 'num_pages' );

            var toItem;
            var toPage;

            if( curPage < 0 ) {
                curPage =  0;
            } else if( curPage >= numPages ) {
                curPage =  numPages - 1;
            }

            if( curItem < 0 ) {
                curItem =  0;
            } else if( curItem >= numItems ) {
                curItem =  numItems - 1;
            }

            if( direction == 'next' ) {
                if( offset ) {
                    toItem = curItem + offset;
                } else if( isPaginated ) {
                    toPage = Math.floor( curPage ) + 1;
                } else {
                    toItem = curItem + itemsPerPage;
                }
            } else if( direction == 'prev' ) {
                if( offset ) {
                    toItem = curItem - offset;
                } else if( isPaginated ) {
                    toPage = Math.ceil( curPage ) - 1;
                } else {
                    toItem = curItem - itemsPerPage;
                }
            }

            if( toPage >= numPages ){
                toPage = 0;
            } else if( toPage < 0 ){
                toPage = numPages - 1;
            }

            if( !toItem && toItem !== 0 ) {
                toItem = toPage * itemsPerPage;
            }

            if( toItem >= numItems ){
                toItem = 0;
            } else if( toItem < 0 ){
                toItem = numItems - 1;
            }

            if( toPage || toPage === 0 ) {
                this.set( 'cur_page', toPage, true );
            }

            this.goToByNumber( 'item', toItem );
        }
   };

    this.goToByNumber = function( type, num ) {
       if( ( num || num === 0 ) && typeof num === 'number' && !this.get( 'isInfiniteScrolling' ) && !this.get( 'itemIsChanging' ) ) {
            if( num < 0 ) {
                num = 0;
            }
            var numOf = this.get( 'num_' + type );
            if( num >= numOf ) {
                num = numOf - 1;
            }

            switch( type ) {
                case 'page':
                    var itemsPerPage = this.get( 'items_per_page' );
                    var toItem = num * itemsPerPage;
                    this.set( 'prev_' + type, this.get( 'cur_' + type ), true );
                    this.set( 'cur_' + type, num );
                    this.goToByNumber( 'item', toItem );
                break;

                case 'item':
                    this.set( 'prev_' + type, this.get( 'cur_' + type ), true );
                    this.set( 'cur_' + type, num );
                    this._increaseNumItemChanges();
                break;
            }
        }
    };
};
Juggernaut.OO.Models.PwrSldr.prototype = new Juggernaut.OO.Models.Model();

//SHARED SETUP
//View
PwrSldr.prototype = function(){
    /*** Marvel specific helpers ***/
    var css3 = Juggernaut.cssCheck,
        client = Juggernaut.client,
        __protoMIXINS = {};

    ///////////////
    //NEW HANDLER//
    ///////////////

    function _onCurItemUpdate() {
        var toItem = this.model.get( 'cur_item' );
        var toPage = this.model.get( 'cur_page' );
        var numPages = this.model.get( 'num_pages' );

        if( this.model.get( 'is_paginated' ) && this.model.getOpt( 'infinite_scroll' ) && this.model.getOpt( 'pagination' ) !== 'scroll' ) {
            var direction = this.model.get( 'direction' );
            if( toPage === numPages - 1 && direction == 'prev' ) {
                doInfiniteScroll.call( this,
                    'left', false );
            } else if( toPage === 0 && direction == 'next' ) {
               doInfiniteScroll.call( this,
                    'right', false );
            } else {
                moveToItem.call( this,
                    toItem );
            }
        } else {
            moveToItem.call( this,
                toItem );
        }
    }

    ////////////
    //METHODS //
    ////////////

    //\\\\\\\\GET PAGE/ITEM

    /**
     * Moves the slider forward. If n is undefined or null, then the slider will be advanced by one page. If 'n' is
     * provided, then it will move the slider forward n number of items.
     * @param n
     * @param callback //being depricated in favor of events
     */
    function next( offset, doesNothing, doesLess, isPlay ) {
        var myObj = this;

        //stop playing (unless called by play())
        if( !isPlay ) {
            stop.call( myObj );
        }
        this.model.goInDirection( 'next', offset );
    }

    function previous( offset, doesNothing, doesLess, isPlay ) {
        var myObj = this;

        //stop playing (unless called by play())
        if( !isPlay ) {
            stop.call( myObj );
        }

        this.model.goInDirection( 'prev', offset );
    }

    /**
     * Scroll to page n.
     * @param toPage
     * @param callback
     * @param animate //default is true
     * @param stopAutoPlay //default is true
     */
    function scrollToPage( toPage, callback, doesNothing, stopAutoPlay ) {
        //this.model.goToByNumber( 'page', toPage );
        this.model.one( 'pageChanged', callback );

        if( stopAutoPlay == 'undefined' || stopAutoPlay === true || stopAutoPlay === null ) {
            stop.call( this );
        }
        this.model.goToByNumber( 'page', toPage );
    }

    function skipToPage( toPage ){
        var curPage = Math.round( this.model.getCurPage() * 10 ) / 10; //round to nearest tenth
        var numPages = this.model.get( 'num_pages' );
        var itemsPerPage = this.model.get( 'items_per_page' );

        this.model.set( 'last_page', curPage, true );
        this.model.set( 'cur_page', toPage, true );

        if( toPage >= numPages ) {
            toPage = numPages - 1;
        }

        var toItem = toPage * itemsPerPage;

        moveToItem.call( this,
            toItem, true );
    }

    /**
     * Scroll to item n. n can be the id of the item, or the number of the item, starting at 0.
     * @param toPage
     * @param callback
     */
    function scrollToItem( toItem, callback ) {
        //this.model.goToByNumber( 'item', toItem );
        var myObj = this;
        this.model.one( 'pageChanged', callback );
        this.model.goToByNumber( 'item', toItem );
    }

    function moveToItem( toItem, doNotAnimate ) {
        this.model.set( 'itemIsChanging', true );
        var numItems = this.model.get( 'num_items' );

        if( typeof doNotAnimate !== 'boolean' ){
            doNotAnimate = false;
        }

        var pagination = this.model.getOpt( 'pagination' );

        var $ul = this.model.get( '$ul' );
        var $el = this.model.get( '$el' );

        if( pagination == 'scroll' ){
            //use CSS3 transition for Hammer.js carousel
            var percent = -( ( 100 / numItems ) * toItem );

            setContainerOffset.call( this,
                percent, !doNotAnimate );
            onPageChange.call( this );
        } else {
            var moveDuration;
            if( !doNotAnimate ) {
                moveDuration = this.model.getOpt( 'animation_duration' );
            } else {
                moveDuration = 0;
            }

            var margin = this.model.get( 'margin' );

            var target = $ul.find( 'li:eq(' + toItem + ')' );

            if( target.length ) {
                var pos = target.first().position().left - margin;
                $el.scrollToPlace({
                    scrollX: pos,
                    callback: onPageChange.bind( this ),
                    duration: moveDuration,
                    easing: this.model.getOpt( 'easing' ),
                    previous_clear_queue: true
                });
            }
        }
    }

    /**
     * Function to be run on page change.
     */
     function onPageChange() {
        var myObj = this;
        var lastPage = this.model.get( 'last_page' );

        //if there was no significant page change, don't do callback.
        //if( lastPage != Math.round( this.model.getCurPage() * 10 ) / 10 ) {
            /*setTimeout(
                function() {*/
                    hidePagesOffView.call( myObj );
                /*},
                0
            );*/

            var onPageChangeOpt = this.model.getOpt( 'onPageChange' );
            if( onPageChangeOpt ) {
                onPageChangeOpt.call( myObj );
            }
            this.model.trigger( 'pageChanged' );
        //}
        this.model.set( 'itemIsChanging', false );
    }

    //\\\\\\\\\INFINITE SCROLL
    function doInfiniteScroll( direction, secondTime ) {
        var myObj = this;

        this.model.set( 'isInfiniteScrolling', true );

        var $ul = this.model.get( '$ul' );
        var $el = this.model.get( '$el' );

        var itemsPerPage = this.model.get( 'items_per_page' );
        var numPages = this.model.get( 'num_pages' );
        var pageWidth = this.model.get( 'page_width' );

        var itemStart;
        var itemEnd;
        var positionStart;

        if( direction == 'right' ) {
            var toWidth;

            itemStart = 0;
            itemEnd = itemsPerPage;

            if( !secondTime ) {
                //move page 1 elements to end
                positionStart = numPages * pageWidth;
                //increase drawer size by 1 page
                toWidth = ( numPages + 1 ) * pageWidth;
            } else {
                //move page 1 elements back to where they belong
                positionStart = 0;
                //reset drawer size
                toWidth = numPages * pageWidth;
            }

            positionItems.call( myObj, itemStart, itemEnd, positionStart );
            $ul.css( 'width', toWidth );

            if( !secondTime ) {
                var pos = numPages * pageWidth;

                $el.scrollToPlace({
                    scrollX: pos,
                    callback: function() {
                        onPageChange.call( myObj );
                        doInfiniteScroll.call( myObj,
                            'right', true );
                    },
                    duration: this.model.getOpt( 'animation_duration' ),
                    easing: easing,
                    previous_clear_queue: true
                });

            } else {
                $el.scrollLeft( 0 );
            }
        } else if( direction == 'left' ) {
            var numItems = this.model.get( 'num_items' );

            itemStart = ( numPages - 1 ) * itemsPerPage;
            itemEnd = numItems;

            if( !secondTime ) {
                //move page n elements to beginning
                positionStart =  -( pageWidth );
            } else {
                //move page n elements back to where they belong
                positionStart = ( numPages - 1 ) * pageWidth;

                $ul.css( 'marginLeft', 0 );
                $el.scrollLeft( parseInt( numPages * pageWidth ) );
            }

            positionItems.call( myObj, itemStart, itemEnd, positionStart );

            if( !secondTime ){
                var animationDuration = this.model.getOpt( 'animation_duration' );
                var easing = this.model.getOpt( 'easing' );

                $ul.animate(
                    {
                        marginLeft: pageWidth + 'px'
                    },
                    animationDuration,
                    easing,
                    function() {
                        doInfiniteScroll.call( myObj,
                            'left', true );
                    }
                );
            } else {
                $ul.css( 'marginLeft', 0 );
                $el.scrollLeft( parseInt( numPages * pageWidth ) );
            }
        }

        if( secondTime ) {
            this.model.set( 'isInfiniteScrolling', false );
        }
    }

    /**
     * Sets position of drawer using css. For use with Hammer.js carousel.
     * @param percent
     * @param animate
     */
    function setContainerOffset( percent, animate ) {
        var myObj = this;
        var $ul = this.model.get( '$ul' );

        $ul.removeClass("animate");

        if(animate) {
            $ul.addClass("animate");
        }

        if( css3.perspective ) {
            $ul.css( "transform", "translate3d(" + percent + "%,0,0) scale3d(1,1,1)" );
        } else if(css3.transform) {
            $ul.css( "transform", "translate("+ percent +"%,0)" );
        } else {
            var px = ( (this.model.get( 'page_width' ) * this.model.get( 'num_pages' ) ) / 100 ) * percent;
            $ul.css( "left", px + "px" );
        }
    }

    /**
     * This will hide all li's with display:none that aren't currently within the current page, +-1
     */
    function hidePagesOffView() {
        var myObj = this;
        //only operate if pagination: scroll
        if( this.model.getOpt( 'pagination' ) !== 'scroll' || !this.model.getOpt( 'hide_unshown_items' ) ) {
            return;
        }

        var viewable = {
            min: (this.model.getCurPage() - 1) * this.model.get( 'items_per_page' ),
            max: (this.model.getCurPage() + 2) * this.model.get( 'items_per_page' )
        };
        //hide all, and then show only ones within viewable
        this.model.get( '$lis' ).each(function(k,v){
            if(k < viewable.min || k > viewable.max){
                $(this).css('display', 'none');
            } else {
                $(this).css('display', 'block');
            }
        });
    }

    //\\\\\\\\\\\\\

    function paginate() {
        var myObj = this;
        this.model.set( 'is_paginated', true );
        doPaginationPositioning.call( myObj );
    }


    /**
     * Does some maths dealing with pagination, etc.
     */
    function doPaginationCalculations() {
        var $el = this.model.get( '$el' );
        var $lis = this.model.get( '$lis' );

        var itemWidthPercentage = this.model.getOpt( 'item_width_percentage' );
        var pageWidth = $el.innerWidth();
        var numItems = this.model.get( 'num_items' );

        var itemWidth;

        if( itemWidthPercentage ){
            itemWidth = pageWidth * ( itemWidthPercentage / 100 );
        } else {
            itemWidth = $lis.eq( 0 ).outerWidth();
        }

        var itemsPerPage = Math.floor( pageWidth / itemWidth );
        var margin = ( pageWidth - itemsPerPage * itemWidth ) / ( 2 * itemsPerPage );
        var numPages = Math.ceil( numItems / itemsPerPage );

        this.model.setBatch({
            item_width: itemWidth,
            page_width: pageWidth,
            items_per_page: itemsPerPage,
            margin: margin,
            num_pages: numPages
        });
    }

    /**
     * Positions items for pagination and scrolls to the current page.
     */
    function doPaginationPositioning(){
        var myObj = this;
        if( this.model.getOpt( 'item_width_percentage' ) ) {
            //item width is % of page width
            setItemWidthsTo.call( myObj, this.model.get( 'item_width' ) );
        }
        positionItems.call( myObj,0, this.model.get( '$lis' ).length, 0 );

        skipToPage.call( myObj,
            Math.round( this.model.getCurPage() ) );
    }

    /**
     * Used by doPaginationPositioning() to actually position the items via CSS.
     * @param itemStart
     * @param itemEnd
     * @param positionStart
     */
    function positionItems( itemStart, itemEnd, positionStart ){
        var myObj = this,
            item;
        var pos = positionStart;
        for(var i = itemStart; i < itemEnd; i++){
            item = $( this.model.get( '$lis' )[ i ] );
            pos += this.model.get( 'margin'); //add margin
            this.model.setItemPosition( i, pos );
            item.css({
                'left': pos + 'px',
                'position': 'absolute'
            });
            pos += this.model.get( 'item_width' ) + this.model.get( 'margin' ); //add width and margin
        }
    }

    /**
     * Removes absolute positioning from items.
     */
    function removePositionAbsolute() { //could could be called depaginate
        var myObj = this;
        $.each(this.model.get( '$lis' ), function(k,v){
            $(v).css('position', 'static');
        });

        this.model.setBatch({ //resets information relating to pagination
            margin: 0
        });
    }

    /**
     * Sets all of the items' width to w (needs px or %)
     * @param w
     */
    function setItemWidthsTo(w){
        var myObj = this;
        //only do this if the first item doesn't match for efficiency
        if($(this.model.get( '$lis' )[0]).css('width') != w){
            $.each(this.model.get( '$lis' ), function(k,v){
                $(v).css('width', w);
            });
        }
    }

    /**
     * Calculates and returns the total width & height of all of the contents. Assumes all LI's have the same width.
     */
    function getTotalContentDimensions() {
        var myObj = this,
            firstItem = this.model.get( '$lis' ).first(), width, height;
        width = firstItem.outerWidth(true) * this.model.get( '$lis' ).length;
        // Added an option to check the height of all the slides and choosing the tallest one, otherwise use the first slide as before - @roshow
        if (this.model.get( 'opts' ) && this.model.getOpt( 'check_all_heights' ) === true){
            height = 0;
            this.model.get( '$lis' ).each(function(){
                var nh = $(this).outerHeight(true);
                height = (nh > height) ? nh : height;
            });
        }
        else {
            height = firstItem.outerHeight(true);
        }
        return {
            width: width,
            height: height
        };
    }

    /**
     * Calculates and returns the dimensions that should be applied to the drawer.
     */
    function getDrawerDimensions(){
        var myObj = this,
            dims = getTotalContentDimensions.call(myObj), width;
        if(this.model.get( 'is_paginated' ) ) {
            width = this.model.get( 'num_pages' ) * this.model.get( 'page_width' );
        } else if(client.hasTouch) {
            width = dims.width;
        } else {
            var makeUpWidth = this.model.get( '$lis' ).first().outerWidth(true) + this.model.get( '$el' ).innerWidth();
            width = dims.width <= makeUpWidth ? dims.width : (dims.width - this.model.get( '$lis' ).first().outerWidth(true) + this.model.get( '$el' ).innerWidth());
            //width = dims.width - this.model.get( '$lis' ).first().outerWidth(true) + this.model.get( '$el' ).innerWidth();
        }
        return {
            width: width,
            height: dims.height
        };
    }

    /**
     * Updates UL, wrapper, container, and buttons.
     */
    function update(){
        var myObj = this,_vars = myObj._vars;
        setTimeout(function(){
            doPaginationCalculations.call(myObj);

            if((_vars.opts.pagination == 'auto' && !client.hasTouch) || _vars.opts.pagination == 'scroll'){
                paginate.call(myObj);
            } else if(_vars.opts.item_width_percentage){
                setItemWidthsTo.call(myObj,_vars.item_width);
            } else if(_vars.opts.pagination == 'none' && !client.hasTouch){
                removePositionAbsolute.call(myObj); //to fix a bug where switching between pag'n behaviors
            }

            //update drawer
            var dims = getDrawerDimensions.call(myObj);
            if(_vars.opts.auto_drawer_height){
                _vars.$ul.css({
                    'width':  dims.width + 'px',
                    'height': dims.height + 'px'
                });
                //size wrapper to hide Firefox scrollbar, if present
                _vars.$wrapper.css('height', dims.height + 'px');
            } else {
                _vars.$ul.css({
                    'width': dims.width + 'px'
                });
            }

            //update scrollable class
            if(isScrollable.call(myObj)){
                _vars.$container.addClass('pwrSldr_scrollable').removeClass('pwrSldr_not_scrollable');
            } else{
                _vars.$container.removeClass('pwrSldr_scrollable').addClass('pwrSldr_not_scrollable');
            }
        }, 400);

    }


    /**
     * Schedules a re-draw of the carousel. Will trigger 'pwrSldr_draw' event when ready to redraw.
     */
    function draw(){
        var myObj = this;
        clearTimeout(this.model.get( 'intervals.draw' ) );
        this.model.get( 'intervals' ).draw = setTimeout(function(){
            myObj.model.get( '$el' ).trigger('pwrSldr_draw');
        }, this.model.getOpt( 'redraw_timeout' ) );
    }

    /**
     * For pagination-scroll touch handling.
     * @param ev
     */
    function onTouchEvent(ev) {
        var myObj = this;
        // Stop browser default if bubble_touch_events is false
        if( !this.model.getOpt( 'bubble_touch_events' ) ) {
            ev.preventDefault();
        }

        var cur_page = this.model.getCurPage();

        switch(ev.type) {
            case 'dragright':
            case 'dragleft':

                var angle = ev.gesture.angle;
                if((angle > -160 && angle < -20) || (angle > 20 && angle < 160)){
                    //not a horizontal gesture!
                    return;
                }

                // disable browser scrolling
                ev.gesture.preventDefault();
                stickToFinger.call(myObj,ev);
                break;

            case 'swipeleft':

                // disable browser scrolling
                ev.gesture.preventDefault();
                if(cur_page < this.model.get( 'num_pages' ) - 1){
                    myObj.next.call(myObj);
                    ev.gesture.stopDetect();
                }
                break;

            case 'swiperight':

                // disable browser scrolling
                ev.gesture.preventDefault();
                if(cur_page > 0){
                    myObj.previous.call(myObj);
                    ev.gesture.stopDetect();
                }
                break;

            case 'release':

                // disable browser scrolling
                ev.gesture.preventDefault();
                // more then 50% moved, navigate (if in bounds)
                if(Math.abs(ev.gesture.deltaX) > this.model.get( 'page_width' )/2) {
                    if(ev.gesture.direction == 'right' && cur_page > 0){
                        myObj.previous.call(myObj);
                        break;
                    } else if(ev.gesture.direction == 'left' && cur_page < this.model.get( 'num_pages' ) - 1){
                        myObj.next.call(myObj);
                        break;
                    }
                }
                myObj.scrollToPage.call( myObj,
                    cur_page, null, true, false );
                break;
        }

    }

    function stickToFinger(ev){
        var myObj = this,
            cur_page = this.model.getCurPage();
        var pane_offset = -(100/this.model.get( 'num_pages' ) ) * cur_page;
        var drag_offset = ((100/this.model.get( 'page_width' ) ) * ev.gesture.deltaX) / this.model.get( 'num_pages' );

        // slow down at the first and last pane
        if((cur_page === 0 && ev.gesture.direction == Hammer.DIRECTION_RIGHT) ||
            (cur_page == this.model.get( 'num_pages' )-1 && ev.gesture.direction == Hammer.DIRECTION_LEFT)) {
            drag_offset *= 0.4;
        }

        setContainerOffset.call(myObj,drag_offset + pane_offset, false);
    }


    function setupAutoPlay(){
        var myObj = this;
        //pause on mouse over
        this.model.getOpt( 'touch_target' ).mouseover(function(){pause.call(myObj);});
        this.model.getOpt( 'touch_target' ).mouseout(function(){
            unpause.call(myObj);
        });

        //pause on resize
        $( window ).on(
            'resize',
            function(){
                pause.call(myObj);
                clearInterval(myObj.model.get( 'intervals' ).pause);
                myObj.model.get( 'intervals' ).pause = setTimeout(function(){play.call(myObj);}, 200);
            }
        );

        //stop on touchstart
        this.model.getOpt( 'touch_target' ).on('touchstart', function(){stop.call(myObj);});
        play.call(myObj);
    }

    function play(){
        var myObj = this;
        clearInterval(this.model.get( 'intervals' ).play);
        this.model.get( 'intervals' ).play = setInterval(
            function() {
                myObj.next.call( myObj,
                    null,
                    null,
                    false,
                    true
                );
            },
            this.model.getOpt( 'play_interval' )
        );
        return myObj;
    }

    function stop(){
        var myObj = this;
        clearInterval(this.model.get( 'intervals' ).play);
        this.model.set( 'stopped', true );
        return myObj;
    }

    function pause(){
        var myObj = this;
        clearInterval(this.model.get( 'intervals' ).play);
        return myObj;
    }

    function unpause(){
        var myObj = this;
        if(!this.model.get( 'stopped' ) ){
            play.call(myObj);
        }
    }

    /**
     * This should only be run once.
     */

    function setupEventHandlers(){
        var myObj = this,_vars = myObj._vars;
        //bind events for resize
        $(window).on("resize", function(){
            //make sure el width actually changed (for iOS bug)
            if(_vars.last_known_el_width !== _vars.$el.innerWidth()){
                draw.call(myObj);
            }
            _vars.last_known_el_width = _vars.$el.innerWidth();
        });
        //bind event for pwrSldr_draw
        _vars.$el.on('pwrSldr_draw', function(){update.call(myObj);});

        //bind touch events for pagination-scroll
        if(_vars.opts.handle_touch_events){
            if(_vars.opts.pagination == 'scroll' && client.hasTouch){//avoid mouse dragging on non-touch device
                _vars.opts.touch_target.hammer({ drag_lock_to_axis: true })
                    .on("release dragleft dragright swipeleft swiperight touchstart touchmove", function(ev){onTouchEvent.call(myObj, ev);});
            }
        }
        //bind arrows
        if(_vars.opts.bind_nextprev){
            _vars.$container.find('._prev').on('click', function(e){
                e.preventDefault();
                myObj.previous.call(myObj);
            });
            _vars.$container.find('._next').on('click', function(e){
                e.preventDefault();
                myObj.next.call(myObj);
            });
        }
        _vars.ready = true;

        this.model.on( 'cur_item:updated', _onCurItemUpdate, this );
    }

    /**
     * Re-initializes slider with new parameters. Will fire pwrSldr_draw, so if you're listening on that, be careful not
     * to get stuck in an infinite loop!
     * @param opts
     * @param update //if true, will reinitialize and trigger pwrSldr_draw (redraws the slider). Default: true.
     */
    function changeOpts( opts, update ){
        var myObj = this;
        if(update === null || update === 'undefined') update = true; //default
        this.model.setOpts( opts );
        if( opts.pagination == 'none' ){
            removePositionAbsolute.call( myObj );
            this.model.set( 'is_paginated', false );
        }
        if( update ) init();
        //go back to beginning if pagination:none
        if( opts.pagination == 'none' ){
            scrollToItem.call( this,
                0 );
        }
        return myObj;
    }

    function _preinitVarSetup(){
        var myObj = this,_vars = myObj._vars;
        //do jquery traversal once
        _vars.$ul = _vars.$el.find('> ul');
        _vars.$lis = _vars.$ul.find('> li');
        _vars.num_items = _vars.$lis.length;
        _vars.$wrapper = _vars.$el.parents('.pwrSldr_wrapper');
        _vars.$container = _vars.$el.parents('.pwrSldr_container');
        _vars.last_known_el_width = _vars.$el.innerWidth();

        //reset some defaults
        _vars.is_paginated = false;
    }
    /**
     * Jeremy Clarkson says, "powerslide powerslide powerslide"
     */
    function _init(){
        var myObj = this,_vars = myObj._vars;
        myObj._preinitVarSetup.call(myObj);



        //do some calculations for pagination
        if(_vars.opts.pagination !== 'none'){
            doPaginationCalculations.call(myObj);
        }

        //Setup pagination class
        if(_vars.opts.pagination === 'scroll'){
            _vars.$el.addClass('paginate-scroll');
        }

        //Some devices don't like -webkit-overflow-scrolling: touch.
        //Use pagination:scroll behavior instead
        if(client.hasTouch && client.isAndroidPre42){
            _vars.$el.addClass('paginate-scroll');
            _vars.opts.pagination = 'scroll';
            //update is not triggered on some Android devices using the eventHandlers already set up
            //when changing orientation, so we'll call it by listening to orientationchange directly.
            window.addEventListener("orientationchange", function(){update.call(myObj);}, false);
        }

        if(!_vars.ready)setupEventHandlers.call(myObj);

        //wait a bit and then load
        setTimeout(function(){start.call(myObj);}, 100);
    }

    /**
     * Trigger pwrSldr_draw, wait a bit for it to render, show slider, do callback,
     * and start playing.
     */
    function start(){
        var myObj = this,_vars = myObj._vars;
        _vars.$el.trigger('pwrSldr_draw');
        setTimeout(function(){
            //show slider
            _vars.$container.css('opacity', 1);

            //hide nonvisible items
            hidePagesOffView.call(myObj);

            //slider loaded callback
            _vars.opts.onReady.call(myObj);

            //auto_play
            if(_vars.opts.auto_play && _vars.num_pages > 1){
                setupAutoPlay.call(myObj);
            }
        }, 100);
    }

    ////////////////////
    //GETTERS/SETTERS //
    ////////////////////
    /**
     * Returns the current item number. The current item is the first one that appears completely within the current
     * slider position. This is a somewhat expensive function, so it should only be run when needed.
     */
    function getCurItem(){
        return this.model.getCurItem();
    }

    /**
     * Gets the current page in view. Will return a float if the page is partially in view.
     * @return {Number}
     */
    function getCurPage(){
        return this.model.getCurPage();
    }

    function getNumPages(){ return this.model.get( 'num_pages' ); }
    function getNumItems(){ return this.model.get( 'num_items' ); }
    function getNumItemsPerPage(){ return this.model.get( 'items_per_page' ); }
    function getPagination(){ return this.model.getOpt( 'pagination' ); }
    function isReady(){ return this.model.get( 'ready' ); }

    /**
     * Returns true if the slider is scrollable given it's current width and content.
     * @return {Boolean}
     */
    function isScrollable(){
      return this._vars.$el.isOverflowing();
    }

    /*** reveal api ***/
    return {
        __init: _init,
        __protoMIXINS: __protoMIXINS,
        _preinitVarSetup: _preinitVarSetup,//THIS IS EXPOSED TO ALLOW OVERRIDING VARIABLES FOR CUSTOM EXTENSIONS
        update : update,
        isScrollable: isScrollable,
        scrollToItem: scrollToItem,
        scrollToPage: scrollToPage,
        next: next,
        previous: previous,
        draw: draw,
        getCurItem: getCurItem,
        getCurPage: getCurPage,
        getNumPages: getNumPages,
        getNumItems: getNumItems,
        getNumItemsPerPage: getNumItemsPerPage,
        getPagination: getPagination,
        isReady: isReady,
        play: play,
        stop: stop,
        pause: pause,
        unpause: unpause,
        changeOpts: changeOpts
    };
}();

(function($){
    $.fn.pwrSldr = function(opts, mixin){
        opts = $.extend({
            el: $(this),
            pagination: 'auto',
            infinite_scroll: true,
            animation_duration: 400,
            easing: 'easeInOutQuart',
            touch_target: $(this),
            auto_play: false,
            play_interval: 5000,
            auto_drawer_height: true,
            item_width_percentage: null,
            onPageChange: function(){},
            onReady: function(){},
            redraw_timeout: 50, //the bigger, the longer the delay in redraw, but may solve issues.
            handle_touch_events: true, //if false, we assume the user is binding his/her own touch events
            bubble_touch_events: true, //if false, it prevents any default and stops bubbling (prevents browser scrolling)
            bind_nextprev: true, //if false, will not bind event handlers to ._next and ._prev divs
            hide_unshown_items: false //if true, will hide items not visible for performance benefit
        }, opts);

        var s = new PwrSldr(opts);
        if(mixin)PwrSldr.prototype.__protoMIXINS[mixin].call(s);

        $(this).data('pwrSldr', s);
        $(this).addClass('pwrSldr');
        return s;
    };

})(jQuery);







(function(exports){
  var client = exports.Juggernaut.client;
  exports.PwrSldrInstantiator = (function($){
    /**
     * Finds all objects with class pwrSldr and tries to instantiate them if not already instantiated. For now,
     * this only works with single row sliders (or sliders that don't need any parameters).
     */
    function run(){
        $('.pwrSldr').each(function() {
            var $this = $(this);
            if(!$this.data('pwrSldr')){

                var pagination = 'none';
                var $container = $this.parents('.pwrSldr_container').first();

                if (client.hasTouch && client.isAndroidPre42){
                  $container.css('width', exports.Juggernaut.utilities.getWidthOfSliderForScroll($container) + 'px');
                  $container.parents('.module').first().addClass('pwrSldr-overflow-visible');
                  pagination = 'scroll';
                }

                
                //instantiate slider
                $this.pwrSldr({
                    'pagination': pagination,
                    //'onPageChange' : checkPg,
                    //'onReady' : checkPg
                });
            }
        });
    }

    return {
        run: run
    };

  })(exports.jQuery);
})(this);
