var fakeppt = (function(){
	var isActive = false,
		cur= 0,
		slides= [
			"<h1> Building responsive sites without bottlenecks #buildrwd </h1><h4><span class='icon-marvel-logo'></span> Juggernaut framework's basic concepts</h4><h6>Andres Gallo, Front End Developer</h6>",
			"Will cover cool CSS Stuff, including core ideas behing Marvel's Juggernaut framework's client side techniques",
			"The project was to redesign Marvel.com with an user experience that is richer, more awesome, and ...responsive",
			"Responsive design and its bottlenecks we were looking to circumvent",
			"Our solution required 3 core rules",
			"<ul><li>File architecture</li><li>Framework Rules</li><li>SASS_BUILD Magic script</li></ul>",
			"<h1> You are losing them! Say something awesome</h1>",
			"Lets discuss what these 3 ammendments",
			"<h1>File architecture</h1>",
			"<h2>File architecture</h2>Every piece is its own decoupled namespace",
			"<h2>File architecture</h2>Some helpers to help us generate CSS that consistent matches our framework's rules, and other useful ones",
			"<h1>Framework rules/guidelines</h1>",
			"<h1>Framework rules/guidelines</h1> Specific structure that helps us easily be able to pick out and clean code",
			"<h1>Framework rules/guidelines</h1> Specific structure that helps us target code more easily for specific devices",
			"<h1>SASS_BUILD Magic Script</h1>",
			"<h1>SASS_BUILD Magic Script</h1> - Export Files",
			"<h1>SASS_BUILD Magic Script</h1> - Variants Files",
			"Did I forget anything?",
			"<h1>hmmm, YEAH.. Lets try some of these</h1>",
			"<h1>Best of voting info</h1><ul><li>Text your vote to (504) 229-6828— which is also (504) BAYOU-AT</li><li>Message should be <span style='color:red;'>'#buildrwd (X) some comment'</span>' where (X) is your rating from 1-5</li><li>I always liked the number 5</li></ul>"
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

	$(document).on('ready',function(){
		open();
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
	PwrSldrInstantiator.run();
})(document);