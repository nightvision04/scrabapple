// --- File: Tile.test.js ---
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DragDropContext, Droppable } from 'react-beautiful-dnd';
import Tile from './Tile';

describe('Tile Component', () => {
    const renderTile = (props) => {
        return render(
            <DragDropContext onDragEnd={() => {}}>
                <Droppable droppableId="test-droppable">
                    {(provided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps}>
                            <Tile {...props} />
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>
        );
    };

    it('renders without crashing', () => {
        renderTile({ value: 'A', isSelected: false });
        const tileElement = screen.getByText('A');
        expect(tileElement).toBeInTheDocument();
    });

    it('calls onTileClick when clicked', () => {
        const mockOnTileClick = jest.fn();
        renderTile({ value: 'B', isSelected: false, onTileClick: mockOnTileClick });
        const tile = screen.getByText('B');
        fireEvent.click(tile);
        expect(mockOnTileClick).toHaveBeenCalled();
    });

    it('applies selected class when isSelected is true', () => {
        renderTile({ value: 'C', isSelected: true });
        const tile = screen.getByText('C');
        expect(tile.parentElement.parentElement).toHaveClass('ring-2 ring-blue-500');
    });
});