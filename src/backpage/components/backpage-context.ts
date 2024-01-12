import {createContext} from 'react';

import type {BackPage} from '../backpage.js';

export const BackPageContext = createContext<BackPage>(undefined!);
