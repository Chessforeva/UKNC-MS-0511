/*

 Floppy for UKNC (.BKD, .RTD)
 
	Disk rotation speed is fixed: each 32 processor ticks = 1 word (2bytes) from disk.

*/

// A floppy drive class object 
FloppyDrive = function(i) {

	var self = this; 

	this.attached = false;
	this.FileName = "";		       // File name
	this.id = i.toString()+':';			// id
    /*bool*/ this.okNetRT11Image = false;  // true - .rtd image, false - .dsk image
    /*bool*/ this.okReadOnly = false;    // Write protection flag
    /*uint16_t*/ this.track = 0;         // Track number: from 0 to 79
    /*uint16_t*/ this.side = 0;          // Disk side: 0 or 1
    /*uint16_t*/ this.p = 0;       // Data offset within data - "head" position
    /*uint16_t*/ this.datatrack = 0;     // Track number of data in data array
    /*uint16_t*/ this.dataside = 0;      // Disk side of data in data array
    /*uint8_t*/ this.data = [];		// Raw track image for the current track
    /*uint8_t*/ this.marker = [];		// Marker positions
	this.bytesAll = [];				// all bytes

/*void*/ this.Reset = function() {

    self.datatrack = 0;
	self.dataside = 0;
    self.p = 0;
	self.bytesAll = [];
	self.attached = false;
	}
	
	return this;
}

FloppyController = function() {

	var self = this;
	
	var /*FloppyDrive*/ drivedata = [];  // [4] Floppy drives
    var /*FloppyDrive*/ D;  // Current drive (pointer to object)
	
    var /*uint16_t*/ drive=0;       // Current drive number: from 0 to 3
    var /*uint16_t*/ track=0;       // Track number: from 0 to 79
    var /*uint16_t*/ side=0;        // Disk side: 0 or 1

	var st = FLOPPY.STATUS;		// to shorten
	var cm =  FLOPPY.CMD;
	var Sz = FLOPPY.RAWTRACKSIZE;		// most used constant
	
    var /*uint16_t*/ status =  st.TRACK0 | st.WRITEPROTECT;
    var /*uint16_t*/ flags = cm.CORRECTION500 | cm.SIDEUP | cm.DIR | cm.SKIPSYNC;

    var /*uint16_t*/ datareg=0;     // Read mode data register
    var /*uint16_t*/ writereg=0;    // Write mode data register
    var /*bool*/ writeflag=false;   // Write mode data register has data
    var /*bool*/ writemarker=false; // Write marker in marker
    var /*uint16_t*/ shiftreg=0;    // Write mode shift register
    var /*bool*/ shiftflag=false;   // Write mode shift register has data
    var /*bool*/ shiftmarker=false; // Write marker in marker
    var /*bool*/ writing=false;     // true = write mode, false = read mode
    var /*bool*/ searchsync=false;  // Read sub-mode: true = search for sync, false = just read
    var /*bool*/ crccalculus=false; // true = CRC is calculated now
    var /*bool*/ trackchanged=false;  // true = data was changed - need to save it into the file

function init() {

	for(var i=0;i<4;i++) drivedata[i] = new FloppyDrive(i);
	D = drivedata[drive];
}
init();

this.getAttached = function() {
	var a = [];
	for (var d=0; d<4; d++) {
		var o = drivedata[d];
		if(o.attached) a.push(o);
		}
	return a;
	}
	
this.get_free_drive_N = function() {				// Which disk drive is unused?
	for (var d=0; d<4; d++) {
		var o = drivedata[d];
		if(!o.attached) return d;
		}
	return -1;
	}
	
// on disconnect, remove disk
this.detach = function()
{
    for (d=0; d<4; d++) self.DetachImage(d);
}

/*void*/this.Reset = function()
{
    FlushChanges();

    drive = side = track = datareg = writereg = shiftreg = 0;
    writing = searchsync = writemarker = crccalculus = false;
    writeflag = shiftflag = trackchanged = false;
    status = (D.okReadOnly) ? (st.TRACK0 | st.WRITEPROTECT) : st.TRACK0;
    flags = cm.CORRECTION500 | cm.SIDEUP | cm.DIR | cm.SKIPSYNC;
    D = drivedata[drive];
	
	if(!D.attached) return;
	
    PrepareTrack();
}

/*bool*/this.AttachImage = function(/*int*/ N, /*string*/ FileName, /*Uint8array*/ bytes )
{
    self.DetachImage(N);	// If image attached - detach one first
	
	drive = N;
	D = drivedata[drive];
	
	// detecting is it .dsk or .rtd simply by extension
    D.okNetRT11Image = FileName.toLowerCase().indexOf(".rtd")==(FileName.length-4);

    // Open file
    D.okReadOnly = false;

    side = track = D.datatrack = D.dataside = D.p = 0;
    datareg = writereg = shiftreg = 0;
    writing = searchsync = writemarker = crccalculus = false;
    writeflag = shiftflag = false;
    trackchanged = false;
    status = (D.okReadOnly) ? st.TRACK0 | st.WRITEPROTECT : st.TRACK0;
    flags = cm.CORRECTION500 | cm.SIDEUP | cm.DIR | cm.SKIPSYNC;
	
	D.FileName = FileName;
	D.bytesAll = [];
	for(var i in bytes) D.bytesAll[i] = (bytes[i]&255)>>>0;		// let's make a simple array for sure
	D.attached = true;

    PrepareTrack();
	
    return true;
}


/*void*/ this.DetachImage = function(/*int*/ N)
{
	FlushChanges();

	drive = N;
	D = drivedata[drive];
	
    if (!D.attached) return;

    D.okNetRT11Image = D.okReadOnly = false;
    D.Reset();
}

/*uint16_t*/ this.GetState = function()
{
    if (track == 0)
        status |= st.TRACK0;
    else
        status &= (~st.TRACK0);
    if (D.p < FLOPPY.INDEXLENGTH)
        status |= st.INDEXMARK;
    else
        status &= (~st.INDEXMARK);
	
	var r = status;
	if(!D.bytesAll.length) r!= FLOPPY.STATUS.MOREDATA;
	
	speed.dsk = true;		// disk drive is active
    return r;
}

/*void*/ this.SetCommand = function(/*uint16_t*/ cmd)
{
    var /*bool*/ okPrepareTrack = false;  // is track in memory?

	// drive changed?
    var /*uint16_t*/ nw = ((cmd & 3) ^ 3) >>>0;
    if (drive != nw)
    {
        FlushChanges();

        drive = nw;
        D = drivedata[drive];
        okPrepareTrack = true;
    }
    cmd &= (~3);  // remove drive info

    // Copy new flags to flags
    flags &= (~cm.MASKSTORED);
    flags |= cmd & cm.MASKSTORED;

    // did side changed?
    if (flags & cm.SIDEUP)  // Side selection: 0 - down, 1 - up
    {
        if (side == 0) { side = 1;  okPrepareTrack = true; }
    }
    else
    {
        if (side == 1) { side = 0;  okPrepareTrack = true; }
    }

    if (cmd & cm.STEP)  // Move head for one track to center or from center
    {
        side = ((flags & cm.SIDEUP) ? 1 : 0);

        if (flags & cm.DIR)
        {
            if (track < 79) { track++;  okPrepareTrack = true; }
        }
        else
        {
            if (track >= 1) { track--;  okPrepareTrack = true; }
        }
    }
    if (okPrepareTrack)
    {
        PrepareTrack();
    }

    if (cmd & cm.SEARCHSYNC) // Search for marker
    {
        flags &= (~cm.SEARCHSYNC);
        searchsync = crccalculus = true;
        status &= (~st.CHECKSUMOK);
    }

    if (writing && (cmd & cm.SKIPSYNC))  // writing the marker
    {
        writemarker = true;
        status &= (~st.CHECKSUMOK);
    }
	
	speed.dsk = true;		// disk drive is active
}

/*uint16_t*/ this.GetData = function()
{
    status &= (~st.MOREDATA);
    writing = searchsync = writeflag = shiftflag = false;
	speed.dsk = true;		// disk drive is active
    return datareg;
}

/*void*/ this.WriteData = function(/*uint16_t*/ data)
{

    writing = true;  // Switch to write mode if not yet
    searchsync = false;

    if (!writeflag && !shiftflag)  // Both registers are empty
    {
        shiftreg = data;
        shiftflag = true;
        status |= st.MOREDATA;
    }
    else if (!writeflag && shiftflag)  // Write register is empty
    {
        writereg = data;
        writeflag = true;
        status &= (~st.MOREDATA);
    }
    else if (writeflag && !shiftflag)  // Shift register is empty
    {
        shiftreg = writereg;
        shiftflag = writeflag;
        writereg = data;
        writeflag = true;
        status &= (~st.MOREDATA);
    }
    else  // Both registers are not empty
    {
        writereg = data;
    }
	speed.dsk = true;		// disk drive is active
}

/*void*/ this.Periodic = function()
{
	
    // disks spinning all the time
    for (d=0; d<4; d++)
    {
		var O = drivedata[d];
        O.p += 2;	// reading word by word...
        if (O.p >= Sz) O.p = 0;	// and from the beginning...
    }
	
	speed.disks_adjust();

	
    // For each drive: reading and writing
    if (!D.attached) return;

    if (!writing)  // Read mode
    {
        datareg = (D.data[D.p] << 8) | D.data[D.p+1];
        if (status & st.MOREDATA)
        {
            if (crccalculus)  // Stop CRC calculation
            {
                crccalculus = false;
                //TODO: Compare calculated CRC to datareg
                status |= st.CHECKSUMOK;
            }
        }
        else
        {
            if (searchsync)  // Search for marker
            {
                if (D.marker[D.p>>>1])  // Marker found
                {
                    status |= st.MOREDATA;
                    searchsync = false;
                }
            }
            else  // Just read
                status |= st.MOREDATA;
        }
    }
    else  // Write mode
    {
        if (shiftflag)
        {
            D.data[D.p] = /*uint8_t*/(shiftreg & 255);
            D.data[D.p+1] = /*uint8_t*/((shiftreg >>> 8) & 255);
            shiftflag = false;
            trackchanged = true;

            if (shiftmarker)
            {
                D.marker[D.p>>>1] = true;
                shiftmarker = false;
                crccalculus = true;  // Start CRC calculation
            }
            else
            {
                D.marker[D.p>>>1] = false;
            }

            if (writeflag)
            {
                shiftreg = writereg;
                shiftflag = writeflag;  writeflag = false;
                shiftmarker = writemarker;  writemarker = false;
                status |= st.MOREDATA;
            }
            else
            {
                if (crccalculus)  // Stop CRC calculation
                {
                    shiftreg = 0x4444;  //STUB
                    shiftflag = false; //Should be true, but temporarily disabled
                    shiftmarker = false;
                    crccalculus = false;
                    status |= st.CHECKSUMOK;
                }
            }

        }
    }
}

// Read track data from file and fill data
function /*void*/ PrepareTrack()
{
    FlushChanges();

    trackchanged = false;
    status |= st.MOREDATA;
    D.p = 0;
    D.datatrack = track;
    D.dataside = side;

    // Track has 10 sectors, 512 bytes each; offset of the file is === ((Track<<1)+SIDE)*5120
    var /*long*/ offset = ((track<<1) + side) * 5120;
    if (D.okNetRT11Image) offset += 256;  // Skip .RTD image header
	
	var data = [];
    var p = offset;
	
		// read one track bytes
	for(var i=0;i<5120;i++,p++) {
		data[i] = ((p>=D.bytesAll.length) ? 0 :  D.bytesAll[p]);
		}
	
    // Fill data array and marker array with marked data
    EncodeTrackData(data);
}

function /*void*/ FlushChanges()
{
    if (!D.attached || !trackchanged) return;

    // Decode track data from data
    var /*uint8_t*/ data = memset([], 0, 5120);

    if (DecodeTrackData(data))  // Write to the file only if the track was correctly decoded from raw data
    {
        // Track has 10 sectors, 512 bytes each; offset of the file is === ((Track<<1)+SIDE)*5120
        var /*long*/ offset = ((D.datatrack<<1) + (D.dataside)) * 5120;
        if (D.okNetRT11Image) offset += 256;  // Skip .RTD image header

		var l = offset + 5120;
		var l2 = l % 512;			// should be block of 512 bytes
		l+=(512-l);					// add tail till 512
		var L = l - D.bytesAll.length;		// 0s to add
		
		while((L--)>0) D.bytesAll.push(0);
		
		p = offset;
		
		for(var i=0; i<5120; i++) {
			D.bytesAll[p++] = data[i];
			}
    }

    trackchanged = false;
}



// Fill data array and marker array with marked data
function /*void*/ EncodeTrackData(/*uint8_t[]*/pSrc)
{
    D.data = memset([], 0, FLOPPY.RAWTRACKSIZE);
    D.marker = memset([], 0, FLOPPY.RAWMARKERSIZE);
	
    var /*uint32_t*/ c = 0;
    var /*int*/ p = 0, gap = 34;
    for (var sect = 0; sect < 10; sect++)
    {
        // GAP
        for (c = 0; c < /*uint32_t*/ gap; c++) D.data[p++] = 0x4e;
        // sector header
        for (c = 0; c < 12; c++) D.data[p++] = 0;
        // marker
        D.marker[p>>>1] = 1;  // ID marker; start CRC calculus
        D.data[p++] = 0xa1;  D.data[p++] = 0xa1;  D.data[p++] = 0xa1;
        D.data[p++] = 0xfe;

        D.data[p++] = /*uint8_t*/(track&255)>>>0;  D.data[p++] = ((side!=0) ? 1 : 0);
        D.data[p++] = /*uint8_t*/((sect+1)&255)>>>0;  D.data[p++] = 2; // Assume 512 bytes per sector
        // crc
        //TODO: Calculate CRC
        D.data[p++] = 0x12;  D.data[p++] = 0x34;  // CRC stub

        // sync
        for (c = 0; c < 24; c++) D.data[p++] = 0x4e;
        // data header
        for (c = 0; c < 12; c++) D.data[p++] = 0;
        // marker
        D.marker[p>>>1] = 1;  // Data marker; start CRC calculus
        D.data[p++] = 0xa1;  D.data[p++] = 0xa1;  D.data[p++] = 0xa1;
        D.data[p++] = 0xfb;
        // data
        for (c = 0; c < 512; c++)
            D.data[p++] = pSrc[(sect<<9) + c];		//*512
        // crc
        //TODO: Calculate CRC
        D.data[p++] = 0x43;  D.data[p++] = 0x21;  // CRC stub

        gap = 38;
    }
    // fill GAP4B to the end of the track
    while (p < Sz) D.data[p++] = 0x4e;
}

// Decode track data from raw data
// Raw is array[Sz=6250] of bytes
// Dest is array of 5120 bytes
// Returns: true - decoded, false - parse error
/*bool*/ function DecodeTrackData(/*uint8_t[]*/ Dest)
{
	var Raw = D.data;
    var /*uint16_t*/ p=0,  r=0;  // Offsets in data array
    while( p<Sz )
    {
        while (p < Sz && Raw[p] == 0x4e) p++;  // Skip GAP1 or GAP3
        if (p >= Sz) break;  // End of track or error
        while (p < Sz && Raw[p] == 0) p++;  // Skip sync
        if (p >= Sz) return false;  // Something wrong

        if (p < Sz && Raw[p] == 0xa1) p++;
        if (p < Sz && Raw[p] == 0xa1) p++;
        if (p < Sz && Raw[p] == 0xa1) p++;
        if (p >= Sz) return false;  // Something wrong
        if (Raw[p++] != 0xfe)
            return false;  // Marker not found

        var /*uint8_t*/ sectcyl, secthd, sectsec, sectno = 0;
        if (p < Sz) sectcyl = Raw[p++];
        if (p < Sz) secthd  = Raw[p++];
        if (p < Sz) sectsec = Raw[p++];
        if (p < Sz) sectno  = Raw[p++];
        if (p >= Sz) return false;  // Something wrong

        var /*int*/ z;		// Sector size
        if (sectno == 1) z = 256;
        else if (sectno == 2) z = 512;
        else if (sectno == 3) z = 1024;
        else return false;  // Something wrong: unknown sector size
        // crc
        if (p < Sz) p++;
        if (p < Sz) p++;

        while (p < Sz && Raw[p] == 0x4e) p++;  // Skip GAP2
        if (p >= Sz) return false;  // Something wrong
        while (p < Sz && Raw[p] == 0x0) p++;  // Skip sync
        if (p >= Sz) return false;  // Something wrong

        if (p < Sz && Raw[p] == 0xa1) p++;
        if (p < Sz && Raw[p] == 0xa1) p++;
        if (p < Sz && Raw[p] == 0xa1) p++;
        if (p >= Sz) return false;  // Something wrong
        if (Raw[p++] != 0xfb)
            return false;  // Marker not found

        for (var c = 0; c < z; c++)  // Copy sector data
        {
            if (r >= 5120) break;  // End of track or error
            Dest[r++] = Raw[p++];
            if (p >= Sz)
                return false;  // Something wrong
        }
        if (p >= Sz)
            return false;  // Something wrong
        // crc
        if (p < Sz) p++;
        if (p < Sz) p++;
    }

    return true;
}

  this.reSized819200 = function( bytes ) {
  
	FlushChanges();
  
	var L = 819200, a = bytes, l = bytes.length, i, c, q, trunc=true;
	if(l>=L) {
	 c = a[L-1];	// last symbol
	 for(i=L;i<l && trunc;i++) {
		q=a[i]; if(q!=0&&q!=255&&q!=c) trunc=false;
		}
	 if(trunc) {
		var A = new Uint8Array(L);
		for(i=0;i<L;i++) A[i]=a[i];
		return A;
		}
	}	
	return bytes;
  }
  

	return this;
}

