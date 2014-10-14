###### Just download & open the index.html to view this code in action. Its ready to go. In the iphone emulator for example a mobile optimized variant is run ######


This is the codebase we were looking at as we were going through how we have structured our framework to allow us an optimal coding environment with an output which eliminated the performance issues associated with responsive design.

# The bottlenecks #
*	If we keep the codebase minimal it may be hard to achieve fancy tricks, but if we do fancy tricks devices that don't support our fancy tricks will still load the code for the fancy tricks.
	*	Bad solution- Sacrifice branding to keep code minimal
*	We can keep all the fancy stuff and separate the files manually so we don't load pieces where they need not be loaded. But now there are so many more files to worry about. This is a development bottleneck

# The 3 step solution - It also makes Desktop Media queries so IE can understand the CSS in there #
## File Structure ##
*	In there you can see a standard file structure. which we use as its a best practice which works
*	In a real life scenario however it would be a further enhancement to use a build script tool such as grunt/gulp to further enhance the work flow while making less http requests.
*	SASS Structure- (Found inside styles folder)
	*	Separates Code into namespaces. The code in each file only pertains to the features of that file/module.   
*	Global stuff is separated from module specific stuff. Helpers are also separated into their own folder

## Framework Rules ##
*	To build a site without these bottlenecks, our framework needs to have some rules where can predictively and programmatically built upon scripts for optimization
	*	In our framework we for example use namespaces in the <html> 'ala Modernizr', and know to use those classes to target styles that require such behaviors. These classes let us write selectors like '.touch img...' or 'no-touch img...'
		*	The equivalent class names in our code base for example are 'device_NOT_HASTOUCH' vs 'device_HASTOUCH', but the idea is exactly the same
	*	In our framework we use specific media queries so that we know what css rules inside this are actually truly supported in which devices.
	*	In our framework originally we needed to support IE8. So a rule we had is that every large media query is duplicated in a non mediaquery format so IE8 can process all the large/desktop view css rules properly. (We remove the duplication also)

## A Magic Script ##
*	We have a ruby based script that piggybacks on sass, which through regex lookups does the following magic.
	*	Creates variant versions of the original CSS minus the pieces that don't belong on each given type of device.(Sample at the end of this document)
	*	Creates export versions of the original CSS which are pretty versions of the CSS which include only specific class. Great for making IE hacks files, where they get automatically moved to a separate file.

You can use the show slides link, and go through them using the arrow keys.

## Sample of the almost magical part of the process ##
*	For a sample of this. I have also included one of the files we modified live during the session
	*	https://github.com/andresgallo/CSSDevConf/blob/master/styles/sass/examples.scss
*	The variants and exports are also in there.  The files with 'export' in the name are the exports
	*	https://github.com/andresgallo/CSSDevConf/tree/master/styles
 


