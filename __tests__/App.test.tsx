/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('../src/navigation/AppNavigator', () => 'AppNavigator');

import App from '../App';

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    const tree = ReactTestRenderer.create(<App />);
    tree.unmount();
  });
});
