(function () {
	var Names = "Orbital Launcher > NASA Construction Center~" +
					"Nuclear Missile Launcher > Nuclear Missile Launch Site~" +
					"Anti-Nuke Launcher > Nuclear Defense System~" +
					"Halley > Naqahdah Rocket Motor~" +
					"Fabrication Bot > Construction Robot~" +
					"Fabrication Ship > Construction Boat~" +
					"Fabrication Vehicle > Construction Tank~" +
					"Fabrication Aircraft > Construction VTOL Aircraft~" +
					"Fabrication Bot Combat > Armored Construction Robot~" +
					"Advanced Fabrication Bot > Construction Robot~" +
					"Advanced Fabrication Ship > Construction Boat~" +
					"Advanced Fabrication Vehicle > Construction Tank~" +
					"Advanced Fabrication Aircraft > Construction VTOL Aircraft~" +
					"Advanced Fabrication Bot Combat > Armored Construction Robot~" +
					"Orbital Fabrication Bot > Construction Satellite~" +
					"Commander > MALP v2~" +
					"Skitter > Scout Jeep~" +
					"Spinner > AA Truck~" +
					"Unit Cannon > Abrams Tank~" +
					"Ant > Abrams Tank~" +
					"Inferno > Flamethrower Abrams Tank~" +
					"Leveler > Trinium Abrams Tank~" +
					"Sheller > Mortar Abrams Tank~" +
					"Vanguard > Trinium Flamethrower Abrams Tank~" +
					"Boom > Replicator~" +
					"Stinger > AA Jaffa Warrior~" +
					"Dox > Jaffa Warrior~" +
					"Slammer > Kull Warrior~" +
					"Gil-E > US Army Sniper~" +
					"Firefly > Scout Drone~" +
					"Pelican > CH-47 Chinook~" +
					"Hummingbird > X-301~" +
					"Bumblebee > Al'kesh~" +
					"Peregrine > Atmospheric X-302~" +
					"Kestrel > A-10 Thunderbolt~" +
					"Hornet > Ha'tak~" +
					"Sun Fish > Scout Boat~" +
					"Narwhal > AA Boat~" +
					"Orca > Light Battleship~" +
					"Leviathan > Heavy Battleship~" +
					"Stingray > Missile Carrier~" +
					"Pelter > Light Howitzer~" +
					"Umbrella > Anti-Space ION Cannon~" +
					"Catapult > Cruise Missile Launcher~" +
					"Holkins > Heavy Howitzer~" +
					"Avenger > Space Based X-302~" +
					"Anchor > Heavy Defense Satellite~" +
					"Astraeus > Goa'uld cargo ship~" +
					"SXX-1304 Laser Platform > Heavy Laser Satellite~" +
					"Teleporter > Stargate";

	model.LUnitNames.RulesArray = model.LUnitNames.RulesArray.concat(Names.split("~"));
	
	console.log("LStargateUnitNames: Extension complete");
})();