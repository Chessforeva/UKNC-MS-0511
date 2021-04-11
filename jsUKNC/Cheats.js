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
 
 var FLAGS = 0;
 
 this.reset = function() {
 
	FLAGS = 0;
	self.FileName = "";
 }
 
 this.livesfinder = function() {
 
  var a=lv_dmp;
  a.a[a.c++] = [ RAM[0].slice(), RAM[1].slice(), RAM[2].slice() ];
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
	else s="not found\n";
	LOG(s);
	
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
 
 function subst_ShiftSpace() {
	if((FLAGS&1)==0) {
		RAM[0][65535]=207;
		keyboard.Subst_Key(32, 69); touch_Subst_Key(75, 69);
		FLAGS|=1;
	}
 }
 
 
 this.hack = function() {
 
 var f = self.FileName;
 
 /* Knight.uknc */
 if( f=="knight.uknc" || RAM[0][65535]==207 ) {
	RAM[0][65535]=207;	// we know this file
	subst_ShiftSpace();	// if Knight then substitute keys
	RAM[1][10089] = 8;	// hack lives
	}
	
if( f=="arkanoid.uknc" || RAM[0][65535]==207 ) {
	RAM[0][65535]=207;
	subst_ShiftSpace();
	RAM[2][9062] = 112;	// hack lives (not sure)
	}

if( f=="puckman.uknc" || RAM[0][65535]==207 ) {
	RAM[0][65535]=207;
	RAM[1][7771] = 7;	// hack lives (not sure)
	}
	
if( f=="gxonix.uknc" || RAM[0][65535]==207 ) {
	RAM[0][65535]=207;
	RAM[1][12801] = 9;	// hack lives
	}
	
if( f=="lasthero.uknc" || RAM[0][65535]==207 ) {
	RAM[0][65535]=207;
	subst_ShiftSpace();
	}	
  
if( f=="boa.uknc" || RAM[0][65535]==207 ) {
	RAM[0][65535]=207;
	keyboard.Subst_Key(37/*Left*/, 88/*Numpad 4*/); touch_Subst_Key(78/*default left arrow*/, 88);
	keyboard.Subst_Key(39/*Right*/, 120/*Numpad 6*/); touch_Subst_Key(91/*righ arrow*/, 120);
	keyboard.Subst_Key(38/*Up*/, 101/*Numpad 8*/); touch_Subst_Key(108/*default up arrow*/,101);
	keyboard.Subst_Key(40/*Down*/, 104/*Numpad 5*/); touch_Subst_Key(92/*default down arrow*/, 104);
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




