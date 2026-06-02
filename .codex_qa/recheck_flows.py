import recheck_app as qa

qa.test_generic_flow("Design d'intérieur", "interior")
qa.test_generic_flow("Conception extérieure", "exterior")
qa.test_generic_flow("Conception de jardin", "garden")
qa.test_mask_flow("Peinture intelligente", "paint")
qa.test_mask_flow("Relooking du sol", "floor")
qa.test_generic_flow("Agencement Intelligent", "layout", steps=3)
qa.test_mask_flow("Remplacer des objets", "replace")
qa.test_reference()
