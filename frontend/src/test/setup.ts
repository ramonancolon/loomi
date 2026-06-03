import '@testing-library/jest-dom'

// Make React available globally for test files
import React from 'react'
global.React = React

// Cleanup after each test
afterEach(() => {
    document.body.innerHTML = ''
})
