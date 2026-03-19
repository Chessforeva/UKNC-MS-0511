/*
 Cheating tool;
 Known addresses in various games.
*/

/* 
Helps finding lives in games
Press Ctrl+L, die, Ctrl+L, die, Ctrl+L
See console for possible address.
*/

Cheats = function(){
 
 var self = this;
 
 this.FileName = "";

 this.cheathelp = function() {
	
  alert("Lives cheating tool available:\n"+
	"1.Start a game (see all lives), press Ctrl+L;\n"+
	"2.Die (lives now -1), press Ctrl+L again;\n"+
	"3.Die again (lives now -2) and press Ctrl+L third time.\n"+
	"Tool will look for lives counter and fix it to the initial.\n");
 }
	
 var lv_dmp = {c:0,a:[]};
 var lv_cht = [];
 
 this.reset = function() {
 
	self.FileName = "";
 }
 
 this.livesfinder = function() {
 
  var a=lv_dmp;
  a.a[a.c] = [ RAM[0].slice(), RAM[1].slice(), RAM[2].slice() ];
  var memChr = prep_arr_str(a.a[a.c]);
  // to look the dump into Developers Tools of the browser
  console.log(memChr);

  a.c++;
  
  if(a.c==3) {
	var f=0, s="";
	lv_cht = [];
	for(var v=0;v<3;v++) {
	
	for(var i=0;i<a.a[0][v].length;i++)
		if(a.a[0][v][i]==a.a[1][v][i]+1 && a.a[1][v][i]==a.a[2][v][i]+1) {
		 lv_cht[f++]={addr:i, plane:v, val:a.a[0][v][i]};
		 s+= 'RAM[' + v + '][' + i + '] values=' +
			a.a[0][v][i]+','+a.a[1][v][i]+','+a.a[2][v][i]+'(now)\n';
		}
	}
	if(f) alert("Found "+f+" addresses, cheating now!" + s);
	else alert("Found nothing.");
	if(s.length) LOG(s);
	
	a.c=0;
	}
  else alert('saved RAM dump: ' + a.c + '. of 3' );
 }
 
 function livescheat() {
	for(var i in lv_cht) {
		var o = lv_cht[i];
		RAM[o.plane][o.addr] = o.val;
		// cheating
		}
 }
 
 function subst_RightShift_Space() {
	if(!(GAME.flags&512)) {
			// On Space click act like RightShift
		keyboard.Subst_Key(32/*Space in HTML code*/, 69/*Right Shift on UKNC*/);
			// On TouchButton of code to click act like RightShift
		touch_Subst_Key(75/*Space in UKNC*/, 69/*Right Shift on UKNC*/);
		GAME.flags|=512;
	}
 }
 
 function subst_Esc_Space() {
	if(!(GAME.flags&1024)) {
		touch_Subst_Key(4/*Esc in UKNC*/,75/*Space on UKNC*/);
		GAME.flags|=1024;
	}
 }
 
 function prep_arr_str( arr ) {
	var b = [], z="          ";
	for(var i=0;i<arr[0].length;i++) {
		var s=(z+(i<<1)).slice(-10) + ": ";
		for(var k=0;k<3;k++) s+=(z+arr[k][i]).slice(-10);
		b[i]=s;
	}
	b[++i] ='addr :  RAM 0   RAM 1   RAM 2';
	return b.join('\n');
 }

 this.hack = function() {
 
 var fn = self.FileName;
 var f2 = GAME.f2;
 var f=((fn && fn.length>0) ? fn : (f2 ? f2 : '' ));

 var signature = RAM[0][65535];
 switch(signature) {
 case 200: f = "knight.uknc"; break;
 case 220: f = "river.uknc"; break;
 case 201: f = "arkanoid.uknc"; break;
 case 204: f = "lasthero.uknc"; break;
 case 205: f = "boa.uknc"; break;
 case 202: f = "MINER.SAV"; break;
 case 230: f = "mine.uknc"; break;
 case 231: f = "land.uknc_"; break;
 case 232: f = "kotribalov.uknc"; break;
 case 233: f = "lode.SAV"; break;
 case 234: f = "welltris.uknc"; break;
 case 235: f = "hwyenc68.dsk"; break;
 case 236: f = "EXPRES.SAV"; break;
 case 237: f = "mklad.uknc"; break;
 case 238: f = "sokoban.uknc"; break;
 case 239: f = "columns.uknc"; break;
 case 240: f = "goblin.uknc"; break;
 case 241: f = "puckman.uknc"; break;
 case 242: f = "gxonix.uknc"; break;
 }
	

 switch(f) {
	
 /* Knight.uknc */
 case "knight.uknc":
	RAM[0][65535]=200;
	subst_RightShift_Space();	// if Knight then substitute keys
	subst_Esc_Space();			// disable Stop on Esc
	RAM[1][10089] = 8;	// hack lives
	var d = TOUCH_CTRL.disabled;
	//if(!d.length) d.push('key_f1');	// disable F1 sleep on touch
	break;
	
 case "lode.SAV":
	RAM[0][65535]=233;
	subst_Esc_Space();
	break;
	
 case "welltris.uknc":
	RAM[0][65535]=234;
	subst_RightShift_Space();
	break;
	
 case "river.uknc":
	RAM[0][65535]=220;
	subst_RightShift_Space();	// if River then substitute keys
	break;

 case "hwyenc68.dsk":
	RAM[0][65535]=235;
	subst_Esc_Space();
	break;

 case "EXPRES.SAV":
	RAM[0][65535]=236;
 	subst_Esc_Space();
	break;
	
 case "mklad.uknc":
	RAM[0][65535]=237;
	RAM[1][2952] = 5;	// hack lives
	break;
	
 case "arkanoid.uknc":
	RAM[0][65535]=201; 
	subst_RightShift_Space();
	subst_Esc_Space();
	RAM[2][9062] = 112;	// hack lives (not sure)
	break;
 
 case "sokoban.uknc":
	RAM[0][65535]=238;
 	subst_Esc_Space();
	break;

 case "columns.uknc":
	RAM[0][65535]=239;
 	subst_Esc_Space();
	break;
	
 case "goblin.uknc":
	RAM[0][65535]=240;
 	subst_Esc_Space();
	break;
	
 case "puckman.uknc":
	RAM[0][65535]=241;
	RAM[1][7771] = 7;	// hack lives (not sure)
	break;
	
 case "gxonix.uknc":
	RAM[0][65535]=242;
	RAM[1][12801] = 9;	// hack lives
	break;
	
 case "lasthero.uknc":
 	RAM[0][65535]=204;
	subst_RightShift_Space();
	break;
  
 case "boa.uknc":
	RAM[0][65535]=205;
 	subst_Esc_Space();
	if(!(GAME.flags&2)) {
		keyboard.Subst_Key(37/*Left*/, 88/*Numpad 4*/); touch_Subst_Key(78/*default left arrow*/, 88);
		keyboard.Subst_Key(39/*Right*/, 120/*Numpad 6*/); touch_Subst_Key(91/*righ arrow*/, 120);
		keyboard.Subst_Key(38/*Up*/, 101/*Numpad 8*/); touch_Subst_Key(108/*default up arrow*/,101);
		keyboard.Subst_Key(40/*Down*/, 104/*Numpad 5*/); touch_Subst_Key(92/*default down arrow*/, 104);
		GAME.flags|=2;
	}
	break;
	
 case "MINER.SAV":
	RAM[0][65535]=202;
	subst_Esc_Space();
	if(!(GAME.flags&2)) {
		// Make touch startgame...
		touch_Subst_Key(26/*3 in UKNC*/, 69/*Right Shift on UKNC*/);
		GAME.flags|=2;
	}
	break;

 case "mine.uknc":
	RAM[0][65535]=230;
	subst_Esc_Space();
	break;
	
 case "land.uknc_":
	RAM[0][65535]=231;
	subst_Esc_Space();
	break;
 case "kotribalov.uknc":
	RAM[0][65535]=232;
	subst_Esc_Space();
	break;
	
 }

 livescheat();	// lives cheating tool

 }
 
 this.gamesMenus = function() {	// activate menu for loaded disks

 if( self.FileName == "bstgames.uknc_" ) games_menu(0);
 if( self.FileName == "gmL1.uknc_" ) games_menu(1);	
 }
 
  // ...cheat like this
 setInterval('cheats.hack()',8000);

 return this;
}

//
// To hook touch presses on canvas
function cheats_onPress(key) {
	
}


function cheats_onRelease(key) {
	
}

// This can substitute keyboard(!) keys
function cheats_pushKey( Key ) {
	
	if(GAME.flags&1024) {
		if( Key.keycode==4 ) Key.keycode = 75;		// Substitute Esc to Space
	}
	
	if(GAME.f2 && GAME.f2.length && GAME.f2=="MINER.SAV") {
		if( Key.keycode==69 ) Key.keycode = 26;
	}
			
	//LOG(Key.keycode + ' ' + Key.pressed);
}