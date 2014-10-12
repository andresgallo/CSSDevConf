if(!Array.prototype.indexOf){Array.prototype.indexOf=function(e,t){var n;if(this==null){throw new TypeError('"this" is null or not defined')}var r=Object(this);var i=r.length>>>0;if(i===0){return-1}var s=+t||0;if(Math.abs(s)===Infinity){s=0}if(s>=i){return-1}n=Math.max(s>=0?s:i-Math.abs(s),0);while(n<i){var o;if(n in r&&r[n]===e){return n}n++}return-1}}

var DPOP = function(props){
    "use strict";
    props = props || {};
    var  myObj = this;

    this._private = {
    	instanceName: props.instanceName,
    	popupId 	: (props.popupId || props.instanceName+"Win"),
    	popup 		: null,
		popup_wrap 	: null,
		props 		: {} 
	};

	//Defer until body is accessible
	if(document.body){
		myObj._init.call(this);
	}else {
		$(document).on('ready',function(){
			myObj._init.call(myObj);
		});
	}
}

DPOP.prototype = (function($, dox){
	"use strict";

	var _DOMAvailable = false,//Are dPop DOM requirements ready
		_protoReady = false,
    	_lastCall = {},//Keep track of last call so it may be fired when dPop ready. Holds Functions
    	_$el = {
    		mask 	: null, overlayWrap : null
    	},
    	zIndexIncrement = 999999999;//This increments the CSS z-index by this amount per dPop in view. 

	/**
	 * [PROPERTIES]
	 * @type {Object}
	 * @property {[String]}   css         [CSS classes to customize animations and themes]
	 * @property {[Object]}   incss       [Append inline css styles to popup]
	 * @property {[Bool]}     hasMask     [Specifies if the popup includes screen mask]
	 * @property {[Bool]}     XButton     [Specifies if the popup includes close button]
	 * @property {[Bool]}     fixPosition [Specifies if to attempt to make popup position fixed. Position will degrade gracefully if the popup is too large]
	 * @property {[Function]} onhide      [Callback to trigger once the popup is taken off view]
	 */
	var _defaults = {
		css     	: '',
		incss   	: {},
		hasMask 	: true,
		XButton 	: true,
		fixPosition : true,
		onhide 		: function(){},
		onhideswitch: 0 //bool
	};

	/////////////////////
	//MASK MANAGEMENT - Scoped for clarity. This registration allows sharing one Mask along multiple instances //
	/////////////////////
	var maskMg = (function(){
		var registry = [];
		function push(key){
			if(registry.indexOf(key) < 0)maskMg.registry.push(key);
		}
		function splice(key){
			var index = registry.indexOf(key);
			if(index >= 0) registry.splice(index, 1);
			if(maskMg.registry.length === 0) _$el.mask.removeClass('_DPOP_hasMask');
		}
		return {
			registry: registry,
			push 	: push,
			splice 	: splice
		}
	})();

	/////////////
	//METHODS //
	/////////////

	function _init(){//Instance init
		if(!_DOMAvailable)_createHTMLPlaceHolder();

		this._private.props = $.extend({},_defaults);
		_$el.overlayWrap.append([
			'<div id="'+this._private.popupId+'_wrap" class="_DPOP_window_wrap bringDPopUpOut">',
			'<div id="'+this._private.popupId+'" class="_DPOP_window">',
			'</div>',
			'</div>'
		].join(""));
		this._private['popup'] = dox.getElementById(this._private.popupId);
		this._private['popup_wrap'] = dox.getElementById(this._private.popupId+'_wrap');
		this._private['popup'].DPOP = this;

		if(this._private.instanceName in _lastCall) {
			_lastCall[this._private.instanceName]();
		}

		_DOMAvailable = true;
	}

	function _onHide(){
		this._private.props.onhide();
		this._private.props.onhide = function(){};//reset
	}

	/**
	 * [The heart HTML-wise of the functionality. This is where the structure for the popups is added]
	 */
	function _createHTMLPlaceHolder(){
		var placeHolder = document.createElement('div');
		placeHolder.id = "overlayRelativer";

		var requiredHtmlFrag = document.createDocumentFragment();
		placeHolder.innerHTML = '<div class="_DPOP_mask"></div>';
		requiredHtmlFrag.appendChild(placeHolder);
		document.body.insertBefore(requiredHtmlFrag,document.body.firstChild);
		
		_$el.mask = $('._DPOP_mask');
		_$el.overlayWrap = $('#'+placeHolder.id);	
	};
	

	/**
	 * [Does the popup fit in the window. Used to enable fixed positioning only if the window fits]
	 * @return {[Bool]} [Returns if window fits in window]
	 */
	function _fitsInWindow(){
		return (window.innerHeight || document.body.clientHeight) > $('#'+this._private.popupId).innerHeight()+80;
	};
	
	/**
	 * [_updatePopupSetup is the function that updates the popup window according to the settings passed in API]
	 * @param  {[String]} tpl [template to be printed into window]
	 * @return {[DOM Element]} [Dom element for the popup window]
	 */
	function _updatePopupSetup(tpl){
		var popup = this._private.popup;
		popup.setAttribute('style', "");
		popup.className = (this._private.props.css || '') + "  _DPOP_window";
		popup.innerHTML = tpl;

		//Increment z-index
		this._private.props.incss['z-index'] = function(){
			var $renderedPopups = $( "._DPOP_window_wrap.bringDPopUpIn ._DPOP_window" ),
				zIndexHighest = zIndexIncrement;
			$renderedPopups.each(function(){
				var zIndexCur = parseInt($(this).css("zIndex"), 10);
				if(zIndexCur > zIndexHighest)zIndexHighest = zIndexCur;
			});
			return zIndexHighest + 1;
		}.call(this);

		$(popup).css(this._private.props.incss);
		return popup;
	}

	/**
	 * [Hide all popups, or hide All unless the displayed one has a specific class]
	 * @param  {[Function]}  Function generating a new node to replace current popup with [description]
	 * @param  {Function} callback    [Callback to run after doing the hiding of popup(s)]
	 * @param  {[String]}   onlyHide  [Only hide popup with specific class. Useful to avoid hiding loaders or other crucial popups that may be in view]
	 */
	function hide(replaceWith,callback,onlyHide){
		if(_DOMAvailable){//There is nothing to hide unless dPop is ready
			var popup = this._private.popup,
				popupCSS   = popup.className;					
			if(!replaceWith){
				_onHide.call(this);

				if(popupCSS.search(onlyHide) >= 0 || typeof onlyHide === "undefined"){
					$(this._private.popup_wrap).addClass('bringDPopUpOut').removeClass('bringDPopUpIn');
					$(this._private.popup).css('zIndex', 0);
					maskMg.splice(this._private.instanceName);

				}
			}
		}
	};

	/**
	 * [Create a new popup]
	 * @param  {[String]} tpl        [String making up the content in your popup]
	 * @param  {[Object]} properties [Properties for specific popup.  More detail description on these properties above]
	 */
	function create(tpl,properties){
		var myObj = this;
		/**
		 * Run if ready, otherwise cache call, to run once ready
		 */
		if(_DOMAvailable){
			try{//End last instance
				_onHide.call(this);
			}catch(e){
			}
			
			this._private.props = $.extend({},_defaults,properties);
			
			if(this._private.props.hasMask){
				_$el.mask.addClass('_DPOP_hasMask');
				maskMg.push(this._private.instanceName);
			}else {
				maskMg.splice(this._private.instanceName);
			}
			
			$(this._private.popup_wrap).addClass('bringDPopUpIn').removeClass('bringDPopUpOut');

			if(this._private.props.XButton)tpl = '<a class="dPopClose" href="#"><span class="icon-close"></span></a>' + tpl;
						
			hide.call(this, _updatePopupSetup.call(this, tpl),null);
			_positionEl.call(this);
		}else {
			_lastCall[this._private.instanceName] = function(){//Cache last createCall so it can be fired when dPop is ready
				create.call(myObj, tpl, properties);
			}
		}
	}

	/**
	 * [IE8 needs polyfills to accurately detect scroll speeds]
	 * @return {[Object]} [scroll coordinates for 'x', and 'y']
	 */
	function _scrollPos(){
		return {
			x : (window.pageXOffset !== undefined) ? window.pageXOffset : (document.documentElement || document.body.parentNode || document.body).scrollLeft,
			y : (window.pageYOffset !== undefined) ? window.pageYOffset : (document.documentElement || document.body.parentNode || document.body).scrollTop
		}
	}
	/**
	 * [_positionEl decides wether element is centered using position fixed layout or if it is just to be positioned absolute instead]
	 * @return {[type]} [description]
	 */
	function _positionEl(){
		var $popup = $(this._private.popup);

		//NASTY HACK FOR STOCK BROWSER
		var nua = navigator.userAgent,
			stockAndroid = ((nua.indexOf('Mozilla/5.0') > -1 && nua.indexOf('Android ') > -1 && nua.indexOf('AppleWebKit') > -1) && !(nua.indexOf('Chrome') > -1)),
			cssObj = {};

		if(stockAndroid){
			cssObj = {
				top: (window.innerHeight / 2) - ($popup.innerHeight() / 2),
				left: (window.innerWidth / 2) - ($popup.innerWidth() / 2),
				bottom: 'auto',
				right: 'auto'
			};
			if(this._private.props.fixPosition && _fitsInWindow.call(this)){
				cssObj['position'] = 'fixed';
			}else {
				cssObj['position'] = 'absolute';
				cssObj['top'] = cssObj['top'] + _scrollPos().y;
			}
			$popup.css(cssObj);
		}else {
			if(this._private.props.fixPosition && _fitsInWindow.call(this)){
				$popup.addClass('dPop_isFixed');
			}else {
				cssObj = {
					position: 'absolute',
					top: _scrollPos().y + 30 +'px'
				};
				$popup.removeClass('dPop_isFixed');
				$popup.css(cssObj);
			}
		}
	}
	
	///////////
	//BINDS //
	///////////
	$(document).on('click','.dPopClose',function(e){
		e.preventDefault();
		$(this).closest("._DPOP_window").get(0).DPOP.hide();
	});

	$(document).on('click','._DPOP_mask',function(e){
		e.preventDefault();
		while(maskMg.registry.length >0){
			window[maskMg.registry[maskMg.registry.length - 1]].hide();
			maskMg.registry.pop();
		}
	});

	return {
		create 	: create,
		hide 	: hide,
		_init 	: _init
	};
})(jQuery, document);





///////////////////
//DPOP instances //
///////////////////
dPop = new DPOP({instanceName: "dPop"});
