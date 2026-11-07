// @ts-check
// Age bands. Each band has a theme folder in web/src/themes/<id>/. A new band is a new entry here plus that folder.

export const BANDS = /** @type {const} */ ([
  { id: 'percy', name: 'Percy and pals', ages: [7, 10] },
  { id: 'galaxy', name: 'Brain galaxy', ages: [11, 14] },
])

export const AGES = /** @type {const} */ ([BANDS[0].ages[0], BANDS.at(-1).ages[1]])

/**
 * @param {number} age
 * @returns {typeof BANDS[number] | undefined} the band of an age, or undefined outside every band
 */
export const bandFor = (age) => BANDS.find(({ ages: [min, max] }) => age >= min && age <= max)
