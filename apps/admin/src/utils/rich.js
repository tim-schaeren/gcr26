import { Children } from 'react';

// Catalog sentences with a formatted part in them ("Type <b>END</b> to
// confirm") come back as a list of words and elements; this renders the list
// with the keys React expects.
export const rich = parts => Children.toArray(parts);
