import type {BackPage} from '../backpage.js';

export function assertBackPageContext(
  context: BackPage | undefined,
  component: string,
): asserts context is Exclude<typeof context, undefined> {
  if (context === undefined) {
    throw new Error(
      `To use <${component}>, you put it under <BackPageContext.Provider>.`,
    );
  }
}
