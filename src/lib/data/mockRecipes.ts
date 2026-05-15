import type { RecipeDTO } from '$lib/types/recipe';

export const mockRecipes: RecipeDTO[] = [
	{
		id: 'rec_strawberry_matcha',
		name: 'Strawberry Matcha',
		pricing: { local: 185, shopee: 195, lazada: 192 },
		ingredientLines: [
			{ id: 'rl_sm_1', ingredientMasterId: 'mid_matcha', quantity: 4, unit: 'g' },
			{ id: 'rl_sm_2', ingredientMasterId: 'mid_strawberry_syrup', quantity: 25, unit: 'ml' },
			{ id: 'rl_sm_3', ingredientMasterId: 'mid_milk', quantity: 220, unit: 'ml' },
			{ id: 'rl_sm_4', ingredientMasterId: 'mid_ice', quantity: 80, unit: 'g' }
		],
		otherLines: [{ id: 'ol_sm_1', otherMasterId: 'oid_cup12oz', quantity: 1, unit: 'piece' }]
	},
	{
		id: 'rec_caramel_macchiato',
		name: 'Caramel Macchiato',
		pricing: { local: 165, shopee: 178, lazada: 175 },
		ingredientLines: [
			{ id: 'rl_cm_1', ingredientMasterId: 'mid_espresso', quantity: 2, unit: 'piece' },
			{ id: 'rl_cm_2', ingredientMasterId: 'mid_vanilla_syrup', quantity: 15, unit: 'ml' },
			{ id: 'rl_cm_3', ingredientMasterId: 'mid_milk', quantity: 200, unit: 'ml' },
			{ id: 'rl_cm_4', ingredientMasterId: 'mid_caramel', quantity: 12, unit: 'ml' }
		],
		otherLines: [
			{ id: 'ol_cm_1', otherMasterId: 'oid_cup8oz', quantity: 1, unit: 'piece' },
			{ id: 'ol_cm_2', otherMasterId: 'oid_sleeve_lid', quantity: 1, unit: 'piece' }
		]
	}
];
