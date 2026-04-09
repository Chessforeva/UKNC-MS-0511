// HardDriveLBA - LBA28 optimized version with immediate DRQ for fast continuous reads (Bad Apple compatibility)
// Claude generated and it is working


HardDriveLBA = function(i) {

	var self = this;

	this.attached  = false;
	this.FileName  = "";
	this.okReadOnly = false;			// can write always
	this.id = "hd"+i.toString()+':';	// id

	var /*bool*/    okInverted  = false;	// Flag: HDD image has inverted bits
	var /*uint8_t*/ status      = IDE.STATUS.BUSY;	// IDE status register
	var /*uint8_t*/ error       = IDE.ERROR.NONE;	// IDE error register
	var /*uint8_t*/ command     = 0;				// Current IDE command
	var /*int*/     numcylinders = 0;				// Cylinder count  (CHS fallback only)
	var /*int*/     numheads    = 0;				// Head count      (CHS fallback only)
	var /*int*/     numsectors  = 0;				// Sectors / track (CHS fallback only)
	var /*int*/     curcylinder = 0;				// Current cylinder (CHS fallback)
	var /*int*/     curhead     = 0;				// Current head     (CHS / LBA bits 27-24)
	var /*int*/     cursector   = 0;				// Current sector   (CHS / LBA bits  7-0)
	var /*int*/     curheadreg  = 0;				// Raw HEAD_NUMBER register value
	var /*int*/     sectorcount = 0;				// Remaining sectors for read/write
	var /*int*/     bI          = 0;				// Byte offset within current buffer: 0..511
	var /*int*/     tm_cnt      = 0;				// Timeout counter
	var /*int*/     tm_evt      = 0;				// Current timed event

	this.bytesAll = [];								// All bytes of disk image

	var buffer = [];								// Sector data buffer (DISK_SECTOR_SIZE = 512 bytes)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Inverts all 512 bytes in the buffer (QBUS bit-inversion artefact)
function /*void*/ InvertBuffer(A) {
	for (var i = 0; i < 512; i++) A[i] = (~A[i]);
}

// Returns true when LBA mode bit (bit 6) is set in the HEAD_NUMBER register
function /*bool*/ IsLBAMode() {
	return (curheadreg & 0x40) !== 0;
}

// ---------------------------------------------------------------------------
// LBA / CHS offset calculation
// ---------------------------------------------------------------------------

// Primary offset function: uses LBA28 when bit 6 of HEAD_NUMBER is set,
// falls back to CHS otherwise (backward compatibility with old images).
/*uint32_t*/ function CalculateLBAOffset() {
	speed.hds = true;
	var /*uint32_t*/ lba;
	if (IsLBAMode()) {
		// LBA28: assemble 28-bit address from registers
		//   bits 27-24  -> low nibble of curheadreg (Device register)
		//   bits 23-16  -> curcylinder high byte  (Cylinder MSB)
		//   bits 15-8   -> curcylinder low  byte  (Cylinder LSB)
		//   bits  7-0   -> cursector              (Sector Number)
		lba = ( ((curheadreg & 0x0F) >>> 0) << 24 ) |
		      ( ((curcylinder >>> 8) & 0xFF) << 16 ) |
		      ( ( curcylinder        & 0xFF) <<  8 ) |
		      (   cursector          & 0xFF);
	} else {
		// CHS fallback (original formula)
		lba = (((curcylinder * numheads) + curhead) * numsectors) + (cursector - 1);
	}
	return (lba * IDE.DISK_SECTOR_SIZE) >>> 0;
}

// ---------------------------------------------------------------------------
// Reset / Attach / Detach
// ---------------------------------------------------------------------------

/*void*/ this.Reset = function() {
	status   = IDE.STATUS.BUSY;
	error    = IDE.ERROR.NONE;
	command  = 0;
	tm_cnt   = 2;
	tm_evt   = IDE.TIMEEVT.RESET_DONE;
}

/*bool*/ this.AttachImage = function(/*string*/ FileName, /*Uint8Array*/ bytes) {

	if (bytes.length < IDE.DISK_SECTOR_SIZE) return false;

	self.bytesAll = bytes;

	// Read first sector into buffer
	for (var j = 0; j < IDE.DISK_SECTOR_SIZE; j++)
		buffer[j] = self.bytesAll[j];

	// Auto-detect inverted image (same as original)
	var /*uint8_t*/ test = 255;
	for (var /*int*/ k = 0x1F0; k <= 0x1FB; k++)
		test &= buffer[k];
	okInverted = (test === 255);
	if (okInverted)
		InvertBuffer(buffer);

	// Calculate CHS geometry from sector-0 header (kept for CHS fallback + IdentifyDrive)
	numsectors   = buffer[0];
	numheads     = buffer[1];

	// For LBA images the geometry fields may be zero - that is fine.
	// We only enforce geometry limits for pure CHS images.
	if (numsectors > 0 && numheads > 0) {
		numcylinders = parseInt(self.bytesAll.length / IDE.DISK_SECTOR_SIZE / numsectors / numheads);
		// Relax the 1024-cylinder limit that the original class enforced -
		// large LBA images are addressed by LBA28 anyway.
		if (numcylinders === 0) return false;
	} else {
		// LBA-only image: derive a synthetic geometry for IDENTIFY
		numsectors   = 63;
		numheads     = 16;
		numcylinders = Math.floor(self.bytesAll.length / IDE.DISK_SECTOR_SIZE / numsectors / numheads);
		if (numcylinders === 0) numcylinders = 1;
	}

	curcylinder = curhead = curheadreg = cursector = bI = 0;

	status = IDE.STATUS.BUSY;
	error  = IDE.ERROR.NONE;

	self.FileName = FileName;
	self.attached = true;

	return true;
}

/*void*/ this.DetachImage = function() {
	self.bytesAll = [];
	self.attached  = false;
}

// ---------------------------------------------------------------------------
// Port I/O
// ---------------------------------------------------------------------------

/*uint16_t*/ this.ReadPort = function(/*uint16_t*/ port) {
	var /*uint16_t*/ data = 0;
	switch (port) {
	case IDE.PORT.DATA:
		if (status & IDE.STATUS.BUFFER_READY) {
			data = /*uint16_t*/ N16(buffer[bI++], buffer[bI++]);
			if (!okInverted)
				data = ((~data) & 0xFFFF) >>> 0;  // QBUS inverts bits when image is non-inverted

			if (bI >= IDE.DISK_SECTOR_SIZE) {
				// Full sector consumed - immediately prepare next one (no delay)
				ContinueRead();
			}
		}
		break;
	case IDE.PORT.ERROR:
		data = 0xFF00 | error;
		break;
	case IDE.PORT.SECTOR_COUNT:
		data = 0xFF00 | ((sectorcount & 0xFFFF) >>> 0);
		break;
	case IDE.PORT.SECTOR_NUMBER:
		data = 0xFF00 | ((cursector & 0xFFFF) >>> 0);
		break;
	case IDE.PORT.CYLINDER_LSB:
		data = 0xFF00 | ((curcylinder & 255) >>> 0);
		break;
	case IDE.PORT.CYLINDER_MSB:
		data = 0xFF00 | (((curcylinder >>> 8) & 255) >>> 0);
		break;
	case IDE.PORT.HEAD_NUMBER:
		data = 0xFF00 | ((curheadreg & 0xFFFF) >>> 0);
		break;
	case IDE.PORT.STATUS_COMMAND:
		data = 0xFF00 | status;
		break;
	}

	speed.hds = true;
	return data;
}

/*void*/ this.WritePort = function(/*uint16_t*/ port, /*uint16_t*/ data) {
	switch (port) {
	case IDE.PORT.DATA:
		if (status & IDE.STATUS.BUFFER_READY) {
			if (!okInverted)
				data = ((~data) & 0xFFFF) >>> 0;  // QBUS bit inversion
			buffer[bI++] = ( data        & 255) >>> 0;
			buffer[bI++] = ((data >>> 8) & 255);

			if (bI >= IDE.DISK_SECTOR_SIZE) {
				status &= (~IDE.STATUS.BUFFER_READY);
				ContinueWrite();
			}
		}
		break;
	case IDE.PORT.ERROR:
		// Writing precompensation value - ignore
		break;
	case IDE.PORT.SECTOR_COUNT:
		data &= 255;
		sectorcount = ((data === 0) ? 256 : data);
		break;
	case IDE.PORT.SECTOR_NUMBER:
		data &= 255;
		cursector = data;
		break;
	case IDE.PORT.CYLINDER_LSB:
		data &= 255;
		curcylinder = (curcylinder & 0xFF00) | (data & 255);
		break;
	case IDE.PORT.CYLINDER_MSB:
		data &= 255;
		curcylinder = (curcylinder & 255) | ((data & 255) << 8);
		break;
	case IDE.PORT.HEAD_NUMBER:
		data &= 255;
		curhead    = data & 15;
		curheadreg = data;
		break;
	case IDE.PORT.STATUS_COMMAND:
		data &= 255;
		HandleCommand(/*uint8_t*/ (data & 255));
		break;
	}
	speed.hds = true;
}

// ---------------------------------------------------------------------------
// Periodic tick  (called every system frame from CMotherboard::SystemFrame)
// ---------------------------------------------------------------------------

/*void*/ this.Periodic = function() {
	if (tm_cnt > 0) {
		tm_cnt--;
		if (tm_cnt === 0) {
			var /*int*/ evt = tm_evt;
			tm_evt = IDE.TIMEEVT.NONE;
			switch (evt) {
			case IDE.TIMEEVT.RESET_DONE:
				status &= (~IDE.STATUS.BUSY);
				status |=  IDE.STATUS.DRIVE_READY | IDE.STATUS.SEEK_COMPLETE;
				break;
			case IDE.TIMEEVT.READ_SECTOR_DONE:
				// Timed path kept for any edge-case callers;
				// normal LBA reads go through the immediate path in HandleCommand.
				ReadSectorDone();
				break;
			case IDE.TIMEEVT.WRITE_SECTOR_DONE:
				WriteSectorDone();
				break;
			}
		}
	}
}

// ---------------------------------------------------------------------------
// Command dispatcher
// ---------------------------------------------------------------------------

/*void*/ function HandleCommand(/*uint8_t*/ cmd) {
	command = cmd;
	switch (command) {

	// READ SECTOR(S) - LBA28 (0x20) and legacy aliases (0x21 / READ_MULTIPLE variants)
	case IDE.COMMAND.READ_MULTIPLE:   // usually 0x20
	case IDE.COMMAND.READ_MULTIPLE1:  // usually 0x21

		// *** Fast / immediate DRQ path ***
		// Load the first sector straight away - no artificial tm_cnt delay.
		// This prevents the UKNC driver from hitting its DRQ timeout loop
		// during high-speed streaming (Bad Apple demo, large .img files).
		ReadSectorDone();
		break;

	case IDE.COMMAND.SET_CONFIG:
		numsectors = sectorcount;
		numheads   = curhead + 1;
		break;

	// WRITE SECTOR(S) - LBA28 (0x30) and legacy aliases
	case IDE.COMMAND.WRITE_MULTIPLE:   // usually 0x30
	case IDE.COMMAND.WRITE_MULTIPLE1:  // usually 0x31
		bI = 0;
		status |= IDE.STATUS.BUFFER_READY;
		break;

	case IDE.COMMAND.IDENTIFY:
		IdentifyDrive();   // Fill buffer with IDENTIFY data
		bI = 0;
		sectorcount = 1;
		status |=  IDE.STATUS.BUFFER_READY | IDE.STATUS.SEEK_COMPLETE | IDE.STATUS.DRIVE_READY;
		status &= (~IDE.STATUS.BUSY);
		status &= (~IDE.STATUS.ERROR);
		break;

	default:
		break;
	}
}

// ---------------------------------------------------------------------------
// IDENTIFY DRIVE
// ---------------------------------------------------------------------------

function /*void*/ IdentifyDrive() {
	var /*uint32_t*/ totalsectors = (numcylinders * numheads * numsectors) >>> 0;
	memset(buffer, 0, IDE.DISK_SECTOR_SIZE);
	var I = buffer, o = { i: 0 };

	waddI8 (I, o, /*uint16_t*/ 0x045A);			// word  0 - Configuration: fixed disk
	waddI8 (I, o, /*uint16_t*/ numcylinders);		// word  1 - Cylinders
	o.i = 6;
	waddI8 (I, o, /*uint16_t*/ numheads);			// word  3 - Heads
	o.i = 12;
	waddI8 (I, o, /*uint16_t*/ numsectors);			// word  6 - Sectors / track
	o.i = 20;
	waddI8 (I, o, /*uint16_t*/ 65);				// word 10 - Serial number (placeholder 'A')
	o.i = 46;
	waddI8 (I, o, /*uint16_t*/ 65);				// word 23 - Firmware version
	o.i = 54;
	waddI8 (I, o, /*uint16_t*/ 65);				// word 27 - Model number
	o.i = 94;
	waddI8 (I, o, /*uint16_t*/ 0x8001);			// word 47 - Read/write multiple support
	o.i = 98;
	// word 49 - Capabilities:
	//   bit 9 = LBA supported  (0x0200)
	//   bit 8 = DMA supported  (0x0100)  - advertise both
	waddI8 (I, o, /*uint16_t*/ 0x0f00);			// 0x0300 with bit8+bit9, inverted below   0x0f00
	o.i = 106;
	waddI8 (I, o, /*uint16_t*/ 1);				// word 53 - Words 54-58 valid
	waddI8 (I, o, /*uint16_t*/ numcylinders);		// word 54
	waddI8 (I, o, /*uint16_t*/ numheads);			// word 55
	waddI8 (I, o, /*uint16_t*/ numsectors);			// word 56
	o.i = 114;
	w2x_addI8 (I, o, /*uint32_t*/ (numheads * numsectors));	// words 57-58 - sectors per CHS
	o.i = 120;
	w2x_addI8 (I, o, /*uint32_t*/ totalsectors);	// words 60-61 - total LBA28 sectors
	o.i = 200;
	w2x_addI8 (I, o, /*uint32_t*/ totalsectors);	// words 100-101 (LBA48 low dword, compatible)

	InvertBuffer(buffer);  // Apply QBUS inversion before returning to caller
}

// ---------------------------------------------------------------------------
// Sector read / write internals
// ---------------------------------------------------------------------------

// Grow bytesAll if the image is smaller than the required offset
function resizeTo(L) {
	if (!self.okReadOnly) {
		var a = self.bytesAll, l = a.length;
		if (l < L) {
			var K = 0;
			while (K < L) K += 0x100000;  // Round up to next 1 MB boundary
			var i = 0, b = new Uint8Array(K);
			while (i < l) b[i] = a[i++];
			while (i < K) b[i++] = 0;
			self.bytesAll = b;
		}
	}
}

// Load the sector at the current address into buffer and assert DRQ immediately
function /*void*/ ReadSectorDone() {
	status &= (~IDE.STATUS.BUSY);
	status &= (~IDE.STATUS.ERROR);
	status |=  IDE.STATUS.BUFFER_READY;
	status |=  IDE.STATUS.SEEK_COMPLETE;

	var /*uint32_t*/ F = CalculateLBAOffset();
	resizeTo(F + IDE.DISK_SECTOR_SIZE);

	var i;
	for (i = 0; i < IDE.DISK_SECTOR_SIZE && self.bytesAll.length > (F + i); i++) {
		buffer[i] = self.bytesAll[F + i];
	}

	if (i !== IDE.DISK_SECTOR_SIZE) {
		status |= IDE.STATUS.ERROR;
		error   = IDE.ERROR.BAD_SECTOR;
		return;
	}

	if (sectorcount > 0)
		sectorcount--;

	// Pre-advance the address registers so that when ContinueRead() fires
	// after the guest has consumed this sector, we are already pointing at
	// the next one - no extra delay required.
	if (sectorcount > 0)
		NextSector();

	error = IDE.ERROR.NONE;
	bI    = 0;
}

// Flush buffer to the image at the current address
function /*void*/ WriteSectorDone() {
	status &= (~IDE.STATUS.BUSY);
	status &= (~IDE.STATUS.ERROR);
	status |=  IDE.STATUS.BUFFER_READY;
	status |=  IDE.STATUS.SEEK_COMPLETE;

	if (self.okReadOnly) {
		status |= IDE.STATUS.ERROR;
		error   = IDE.ERROR.BAD_SECTOR;
		return;
	}

	var /*uint32_t*/ F = CalculateLBAOffset();
	resizeTo(F + IDE.DISK_SECTOR_SIZE);

	var i;
	for (i = 0; i < IDE.DISK_SECTOR_SIZE && self.bytesAll.length > (F + i); i++) {
		self.bytesAll[F + i] = buffer[i];
	}

	if (i !== IDE.DISK_SECTOR_SIZE) {
		status |= IDE.STATUS.ERROR;
		error   = IDE.ERROR.BAD_SECTOR;
		return;
	}

	if (sectorcount > 0)
		sectorcount--;

	if (sectorcount > 0)
		NextSector();

	error = IDE.ERROR.NONE;
	bI    = 0;
}

// Advance address registers to the next sector (CHS or LBA)
function /*void*/ NextSector() {
	if (IsLBAMode()) {
		// LBA28: increment the 28-bit address in-place across the split registers
		var /*uint32_t*/ lba = ( ((curheadreg & 0x0F) >>> 0) << 24 ) |
		                       ( ((curcylinder >>> 8) & 0xFF) << 16 ) |
		                       ( ( curcylinder        & 0xFF) <<  8 ) |
		                       (   cursector          & 0xFF);
		lba = (lba + 1) >>> 0;
		cursector   =  lba        & 0xFF;
		curcylinder = (lba >>>  8) & 0xFFFF;  // bits 23-8   16-bit cylinder pair
		curheadreg  = (curheadreg & 0xF0) | ((lba >>> 24) & 0x0F);
		curhead     = curheadreg & 0x0F;
	} else {
		// CHS fallback (original logic)
		cursector++;
		if (cursector > numsectors) {
			cursector = 1;
			curhead++;
			if (curhead >= numheads) {
				curhead = 0;
				curcylinder++;
			}
		}
	}
}

// Called when the guest has finished reading all 512 bytes of the current sector
function /*void*/ ContinueRead() {
	bI = 0;
	status &= (~IDE.STATUS.BUFFER_READY);
	status &= (~IDE.STATUS.BUSY);

	if (sectorcount > 0) {
		// Immediately load the next sector and set DRQ - no timer needed
		ReadSectorDone();
	}
}

// Called when the guest has written all 512 bytes of the current sector
function /*void*/ ContinueWrite() {
	bI = 0;
	status &= (~IDE.STATUS.BUFFER_READY);
	status |=  IDE.STATUS.BUSY;

	// Writes keep a small simulated delay (matches original timing)
	tm_cnt = IDE.TIME_PER_SECTOR;
	tm_evt = IDE.TIMEEVT.WRITE_SECTOR_DONE;
}

	return this;
}  