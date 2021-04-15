/*

 Performance speed organizer.
 Optimizations.
 Various tricks.

*/

Speed = function() {

	var self = this;

	var M = 1000000;
	this.CpuMHZ = 8*M;	// CPU speed, should be, but is not.
	
	this.bunch = 250;	/* Bunch of cycles, looping settings. Related to 8MHz cycles per second */
	this.fps = 160;		/* Looks much better than 25 */
	
	var Bunch = this.bunch;		// save
	var Fps = this.fps;
	
	this.AFr = false;	/* Animation Frame based performance correction */
	this.tck = 0;		/* ticker [0..60] */
	
	this.Ticks = 0;		/* real CPU + PPU cycles per second performed */
	this.avg_Hz = 0;	/* average */
	

	
	
	/* OPTIMIZER */
	
	this.Optimize = 1;		// default=1, for games
/*
	(mostly used in Board.js)

 1 - fastest optimization, clears processor tickers.
	If disk drive is active, then this sets to Optimize=2.
	If disk drive becomes idle inactive, then automatically Optimize=1.

 2 - tick counters are cleared when/if possible, by math-subtraction.
	The ticker is proper 32 ticks = 1 disk word. Not too fast, but anyway.


Optimize=0	
	Slow but the right UkncBtl version. Comparable results when debugging.
	But JS is too slow to play games. 
	
*/

	// various accessible flags and counters to differ and optimize where possible

	this.dsk = false;		// disk drive is active	(1 - then should count ticks), same for HDD
	var idle = 0;			// counts timing while nothing happens with disk drive
	
	this.OZ = 0;			// 1-calculate counters
	this.cc = 0;			// 1-clear tickers
	this.kN = 0;			// key scanner count, if optimized too much then should set more


  this.set = function( bu, dt ) {
  
	self.bunch = Bunch = bu;	/* Bunch of cycles per 1-loop */
	self.fps = Fps = dt;		/* Loops per second */
	self.tck = 0;		// clear ticker
	self.Ticks = 0;		// and counters
	recalc();
	}

  this.adjust = function() {

	self.avg = (self.Ticks>>>1)/M;		/* CPU, PPU can calculate Bps */
	self.Ticks = 0;
	var q = GE("MHZshow");
	if(q!=null) q.innerHTML = '(oz#' + self.Optimize + ') ~' + self.avg.toFixed(1) + '<font size="1">Mhz</font>';
	}
  
  this.initTicker = function() {
  	self.AFr = (window.requestAnimationFrame!=null);
	if(self.AFr) pulse60tcks();
	}

	// from Floppy Periodic
  this.disks_adjust = function() {
		if(self.dsk) {
			idle = 8000;
			if(self.Optimize==1) {
				self.setOptimize(2);
				}
			self.dsk = 0;
			}
		else {
			if(idle) {
				if((--idle)==0 && self.Optimize==2) {
					self.setOptimize(1);
					}
				}
			}
	}
	
	this.setOptimize = function(n) {
			self.Optimize=n;
			recalc();
			sound.adjConstSpeed();
			}
			
	function recalc() {			// recalculates loop values
		
		switch(self.Optimize) {
		case 0:
			self.bunch = 20000;			// (16 * 20K) * 25 = 8MHz
			self.fps = 25;
			self.OZ = self.cc = 0;		// not used
			self.kN = 1;
			break;
		case 1:
			self.bunch = Bunch;
			self.fps = Fps;
			self.OZ = 0;		// do not calculate counters
			self.cc = 1;		// clear tickers
			self.kN = 16;
			break;
		case 2:						// this is on disk accessing only
			var k = ((Bunch * Fps)/15000)|0;
			if(k<1) k=1;
			self.bunch = 12800*k;
			self.fps = 40;
			self.OZ = 1;		// optimize by calculations
			self.cc = 0;		// do not clear tickers
			self.kN = 8;
			break;
		}
	}
	
	return this;
}

	 /* animation precise pulse 60 times per second */
function pulse60tcks() {

	if((++speed.tck)>=60) {
		speed.adjust();
		speed.tck = 0;
	};
	
	window.requestAnimationFrame(pulse60tcks);
 }