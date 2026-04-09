
//--------------------
//  on loaded
//--------------------
function FPSinit()
{
 speed.initTicker();
 FPSloop();
}

	
//--------------------
// The Main Loop
//--------------------
function FPSloop( onetime )
{
  if(TOUCH_CTRL.infoactivated) {
	  
	  if( (--TOUCH_CTRL.infoactivated)==0 ) scr.DRAW();
  }
  else {
	
   if(!dbg.active) {
    
		// let the CPU, PPU perform a bunch of cycles
	if(!( speed.Optimize ? Board.SystemFrame() : Board.SystemFrame_ukncbtl() )) {
		Cpu.bp = 0;
		Ppu.bp = 0;		// returning from breakpoint
		dbg.show();
		}
	
   speed.disks_adjust();					// disk cases for optimizer
   speed.hdds_adjust();						// HDDs, but it does nothing 
	
   scr.fastDRAW();
   keyboard.processNextKey();		// process queued keys
   }
  }
	
  if(!onetime) setTimeout('FPSloop()', 1000/speed.fps );	// next loop after

}

function ck_extension( file, ext ) {
	return (file.toLowerCase().lastIndexOf(ext.toLowerCase()) == (file.length-4));
}

_GBIN = {
	i:null,
	size:0
};

/* Files to process */
Gbin.onGotAll=function(A)
	{
		GE("UKNCshow").innerHTML = '';	// clear the progress bar
	
		// Find the largest file in the extracted zip
		var B = _GBIN;
		B.i = null; B.size = 0;
		
		var L = A.length;
		if(L<=1) return;	// Will process it on onGot()
	
		var extensions = [".img",".dsk",".rtd",".rom",".bin",".sav",".gme",".gam",".uknc", ".uknc_"];		
				
		var fn,bytes,l;
		for(var i=0;i<L;i++) {
			fn = A[i].name;
			bytes = A[i].data;
			l = bytes.length;
			if(i==0&&L==1&&ck_extension(fn,".zip")) {
				return;	// same zip, do nothing
			}
			if(B.i===null || B.size<l) {
				for(var j=0;j<extensions.length;j++) {
					if(ck_extension(fn,extensions[j])) {
						if(B.size<l) { B.i = i; B.size=l; }
					}
				}
			}
		}
		if(B.i!==null) {
			fn = A[B.i].name;
			bytes = A[B.i].data;
			_gotFile(fn, bytes);
		}
	}

/* File to process */
Gbin.onGot=function(filename, bytes) {
	if(_GBIN.i===null) _gotFile(filename, bytes);
	}
		
function _gotFile(filename, bytes) {
	GAME.f2 = filename;
	cheats.FileName = filename;			// save file name
	var f = filename.toLowerCase();
	if(f.indexOf(".rom")>0) {
		Board.LoadROM(bytes);
		}
	if(f.indexOf(".uknc")>0) {
		Board.LoadFromImage( bytes, ( f.indexOf(".uknc_")>0 ? 1 :0 ) );
		scr.DRAW();
		cheats.gamesMenus();
		}
	if(f.indexOf(".sav")>0 || f.indexOf(".gme")>0 || f.indexOf(".gam")>0) {
		// Load image of saved state of a booted OS that was loaded from a floppy disk 
		Board.LoadFromImage( UkncSAVcase,1 );
		Board.LoadSAV( bytes );		// and overwrite memory in addresses 000000 - 000777
		// let it continue with new CPUs PC,SP
		}
	if(f.indexOf(".dsk")>0 || f.indexOf(".rtd")>0) {
		var n = FloppyCtl.get_free_drive_N();
		if(n>=0) FloppyCtl.AttachImage(n,filename, bytes);
		}
	if(f.indexOf(".bin")>0) {		// cartridges
		var n = Board.get_free_cart_N();
		if(n>0) {
			Board.LoadROMCartridge(n,filename, bytes);
			}
		}
	if(f.indexOf(".img")>0) {
		
		var n = Board.get_free_hdd_drive_N();
		if(n>0) {
			if(f=="bappwd.img") { HDD_LBA[n-1]=1; Board.HardDriveReInit(n); }
			
			var cn = Board.get_free_cart_N();		// also load Cartridge ROM for HDD (ID, not WD)
			if(cn==n) {
						// "ide_wdromv0110.bin" it the old Winchester standard,
						// but it does the same as IDE and does not boot correctly
						// Activates with WDR.SAV, formats with WDX.SAV
						
						if(HDD_LBA[n-1]) Board.LoadROMCartridge(n,"ide_wd.bin",IdeWDbootCart);
						else {
							// The usual case
							// "ide_hdbootv0400.bin" with IDDRIV.SAV, IDINST.SAV
							Board.LoadROMCartridge(n,"ide_boot.bin",IdeHDbootCart);
							}
				}
			HardDrives[n-1].AttachImage(filename, bytes);
			HDs = true;
			}
		}
		
	if(LOADDSK.length>1) {
		LOADDSK = LOADDSK.slice(1);
		GoDisks();	// read next disk or file
		}
	}


/* keypress processing */

function keyact(e){

var kwas=0;		// to prevent default browser action


if(e.keyCode==76 && e.ctrlKey) cheats.livesfinder();
else if(e.keyCode==13 && (e.altKey || e.ctrlKey) && FullScreen==0 ) FullScreen=0.5;
else {

	if(e.type=="keydown") keyboard.keyHit(e);
	if(e.type=="keyup") keyboard.keyRelease(e);
}

if(!dbg.active) kwas = 1;			// needed for small input in debug

if(e.type=="keydown") {
 if(e.keyCode==121 && dbg.active) { dbg.Run(); kwas=1; }
 if(e.keyCode==118 && dbg.active) { dbg.Step(); kwas=1; }
 if(e.keyCode==119 && dbg.active) { dbg.StepOver(); kwas=1; }
 if(e.keyCode==120 && !dbg.active) { dbg.show(); kwas=1; }
}

if(kwas) {
	e.preventDefault();
	e.stopPropagation();
}

}

// does fake key press action
// f=1 touch case, do not release
function pushKey(n,f) {

 keyboard.addKey(n,1);
 if(!f) popKey(n);

}

function popKey(n) {
 keyboard.addKey(n,0);
}


