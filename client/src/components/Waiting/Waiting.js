import React from 'react';

const Waiting = () => {
    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
            <p className="mt-4 text-lg">Waiting for another player...</p>
        </div>
    );
};

export default Waiting;