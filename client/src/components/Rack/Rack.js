import React from "react";
import { Droppable } from "react-beautiful-dnd";
import Tile from '../Tile/Tile';

const Rack = ({ rack, onTileClick, selectedTile }) => {
    // Rich wood grain pattern with visible texture
    const woodGrain = {
        backgroundImage: `
      repeating-radial-gradient(
        circle at 50% 50%,
        rgb(120, 53, 15) 0px,
        rgb(146, 64, 14) 8px,
        rgb(120, 53, 15) 16px
      ),
      linear-gradient(
        90deg,
        rgba(180, 83, 9, 0.9) 0%,
        rgba(146, 64, 14, 0.9) 45%,
        rgba(180, 83, 9, 0.9) 55%,
        rgba(146, 64, 14, 0.9) 100%
      )
    `,
    };

    // Lighting overlays
    const frontLighting = {
        backgroundImage: `
      linear-gradient(
        180deg,
        rgba(255,255,255,0.15) 0%,
        rgba(255,255,255,0.05) 20%,
        rgba(0,0,0,0.05) 60%,
        rgba(0,0,0,0.2) 100%
      )
    `,
    };

    // Side lighting
    const sideLighting = {
        backgroundImage: `
      linear-gradient(
        90deg,
        rgba(0,0,0,0.5) 0%,
        rgba(0,0,0,0.2) 10%,
        rgba(0,0,0,0.2) 90%,
        rgba(0,0,0,0.5) 100%
      )
    `,
    };

    const tileContainerStyle = {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '0.1rem', // Add some space between tiles
        height: '100%',
    };

    const tileStyle = {
        width: '2rem', // Fixed tile width
        height: '2rem', // Fixed tile height
        backgroundColor: 'lightyellow',
        borderRadius: '0.5rem',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
    };

    return (
        <Droppable droppableId="rack" direction="horizontal">
            {(provided) => (
                <div className="flex justify-center w-full mt-3">
                    <div className="w-[60%] relative" style={{ perspective: '1200px' }}>
                        {/* Enhanced shadow system */}
                        <div className="absolute w-full h-8 bg-black/30 bottom-0 rounded-full blur-lg"></div>
                        <div className="absolute w-[95%] h-6 bg-black/20 bottom-1 left-[2.5%] rounded-full blur-md"></div>

                        {/* Enhanced 3D base structure */}
                        <div
                            className="relative"
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                        >
                            {/* Back panel */}
                            <div
                                className="absolute w-full h-[65px] -bottom-3 transform-gpu rounded-b-lg"
                                style={{
                                    ...woodGrain,
                                    transform: 'rotateX(60deg) translateY(12px)',
                                    boxShadow: 'inset 0 -4px 8px rgba(0,0,0,0.3)',
                                }}
                            ></div>

                            {/* Left side panel */}
                            <div
                                className="absolute h-12 w-4 -left-4 bottom-0 transform-gpu origin-right"
                                style={{
                                    ...woodGrain,
                                    ...sideLighting,
                                    transform: 'rotateY(-90deg)',
                                }}
                            ></div>

                            {/* Right side panel */}
                            <div
                                className="absolute h-12 w-4 -right-4 bottom-0 transform-gpu origin-left"
                                style={{
                                    ...woodGrain,
                                    ...sideLighting,
                                    transform: 'rotateY(90deg)',
                                }}
                            ></div>

                            {/* Main rack body */}
                            <div
                                className="w-full h-12 rounded-t-lg p-5 relative transform-gpu"
                                style={{
                                    ...woodGrain,
                                    ...frontLighting,
                                    transform: 'rotateX(5deg)',
                                }}
                            >
                                {/* Inner groove with enhanced depth */}
                                <div
                                    className="absolute inset-2 rounded-md bg-amber-950"
                                    style={{
                                        backgroundImage: `
                     repeating-radial-gradient(
                       circle at 50% 50%,
                       rgb(80, 33, 5) 0px,
                       rgb(96, 44, 4) 8px,
                       rgb(80, 33, 5) 16px
                     )
                   `,
                                        boxShadow: `
                     inset 0 2px 4px rgba(0,0,0,0.4),
                     inset 0 -2px 4px rgba(255,255,255,0.1)
                   `,
                                    }}
                                >
                                    {/* Groove lighting effect */}
                                    <div
                                        className="absolute inset-0 rounded-md opacity-40"
                                        style={{
                                            backgroundImage: `
                       linear-gradient(
                         180deg,
                         rgba(0,0,0,0.6) 0%,
                         transparent 20%,
                         transparent 80%,
                         rgba(0,0,0,0.6) 100%
                       )
                     `,
                                        }}
                                    ></div>
                                </div>

                                {/* Tiles container with fixed size and centered tiles */}
                                <div style={tileContainerStyle}>
                                    {rack &&
                                        rack.map((tile, index) => {
                                            const draggableId = `tile-${index}`;
                                            const isSelected =
                                                selectedTile &&
                                                selectedTile.tile === tile &&
                                                selectedTile.from.type === "rack" &&
                                                selectedTile.from.index === index;

                                            return (
                                                <div
                                                    key={index}
                                                    onClick={() => onTileClick(tile, index)}
                                                    className={`cursor-pointer ${isSelected ? "transform -translate-y-1" : ""
                                                        }`}
                                                    style={tileStyle}
                                                >
                                                    <Tile
                                                        draggableId={draggableId}
                                                        index={index}
                                                        value={tile}
                                                        isSelected={isSelected}
                                                    />
                                                </div>
                                            );
                                        })}
                                    {provided.placeholder}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Droppable>
    );
};

export default Rack;