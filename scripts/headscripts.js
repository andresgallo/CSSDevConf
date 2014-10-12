
/* global Modernizr */
///////////////////////////////////////////////////////////////////////////////////////
//THIS WE'D REALLY HANDLE SERVER SIDE, BUT HERE IS THE LOGIC FOR THE SAKE OF CLARITY //
///////////////////////////////////////////////////////////////////////////////////////

/**
 * In the Marvel Juggernaut framework we decided to differentiate styles based on features and available space.  
 * In the backend our tools along with a device database categorizes our devices based on 
 * * the breakpoints.
 * * And touch capabilities
 * Our Sass watch tool removes unecessary styles given the device the code is served to.
 */

(function(){
	'use strict';
	var _styleSheetsArr = [];

	function _init(){
		_setStylesheets();
		_writeStylesheets();
	}

	/**
	 * [_writeStylesheets writes the styles onto the page.  In reality this should live in the backend]
	 */
	function _writeStylesheets(){
		var frag =  document.createDocumentFragment();
		while(_styleSheetsArr.length >= 1){
			var link = document.createElement('link');
			link.rel = 'stylesheet';
			link.href = 'styles/'+_styleSheetsArr.shift()+'.css';
			frag.appendChild(link);
		}
		document.getElementsByTagName('head')[0].appendChild(frag); 
	}

	/**
	 * [_setStylesheets is where the different styles for each device is added for printing into the page. 
	 * Ideally this should be in the backend]
	 */
	function _setStylesheets(){
		var bkPoints = [570, 768, 1024],
			sw = screen.width;

		if( !Modernizr.touch) {//Non touched are assumed desktop. In theory we could make more scenarios to be more granular
			_styleSheetsArr.push('main.notouch');
		}else {
			if(sw < bkPoints[0]){
				_styleSheetsArr.push('main.mobile-small');
			}else {
				_styleSheetsArr.push('main.mobile');
			}
		}

		if( Juggernaut.client.ltIE9 ){
			_styleSheetsArr.push('main.noresp');
			_styleSheetsArr.push('main.export_ie8');
		}
	}
	_init();
})();



