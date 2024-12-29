import React from 'react';

const Waiting = () => {
    return (
        <div className="min-h-screen w-full mt-7 bg-amber-50">
            <div className="flex flex-col items-center pt-6 pb-6">
                <div className="animate-spin rounded-full h-24 w-24 border-b-2 border-gray-900"></div>
                <p className="mt-10 text-lg">Waiting for another player...</p>
            </div>
        </div>
    );
};

export default Waiting;