import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DragDropContext, Droppable } from 'react-beautiful-dnd';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import Rack from './Rack';

const mockStore = configureStore([]);

describe('Rack Component', () => {
    let store;

    beforeEach(() => {
        store = mockStore({}); // Initialize the mock store with an empty state
    });

    const renderRack = (props) => {
        return render(
            <Provider store={store}>
                <DragDropContext onDragEnd={() => { }}>
                    <Droppable droppableId="test-droppable">
                        {(provided) => (
                            <div ref={provided.innerRef} {...provided.droppableProps}>
                                <Rack {...props} />
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            </Provider>
        );
    };


    it('renders the correct number of tiles', () => {
        renderRack({ rack: ['A', 'B', 'C', 'D'], onTileClick: () => { }, selectedTile: null });
        const tiles = screen.getAllByRole('button');
        expect(tiles.length).toBe(4);
    });

});