var fakeppt = (function(){
	var isActive = false,
		cur= 0,
		slides= [
			"<h1> Building responsive sites without bottlenecks </h1><h5>Marvel Entertainment</h5><h6>Andres Gallo, Front End Developer</h6>",
			"Will cover cool CSS Stuff, including core ideas behing Marvel's Juggernaut framework's client side techniques",
			"The project was to redesign Marvel.com richer, more awesome, and ...responsive",
			"Responsive desigin and its bottlenecks we were looking to circumvent",
			"File and CSS structure"
		];

	function open(){
		
		dPop.create('<div class="_popContent">'+slides[cur]+'</div>', {
			css: 'fakeppt',
			onhide: function(){
				isActive= false;
			}
		});
		isActive = true;
	}

	function next(){
		cur++;
		open();
	}

	function prev(){
		cur--;
		open();
	}

	$(document).on('keydown',function(e){
		if(isActive){

			switch (e.keyCode) {
			case 37:
			prev();
			break;
			case 39:
			next(); 
			break;
			}

		}
	});
	
	return {
		open: open
	};
})();



/**
 * [Just for fun :)]
 */
(function(dox){
	var audio =dox.createElement('audio'),
		played = false;
	audio.innerHTML = '<source src="audio/smash.ogg" /><source src="audio/smash.mp3" />';
	dox.body.appendChild(audio);
	$(window).on('resize',function(){
		if(!played && screen.width > 800 && 'play' in audio){
			played = true;
			audio.play();

			var fist = document.createElement('div');
			fist.id = 'fist';
			document.body.appendChild(fist);

		}
	});

})(document);