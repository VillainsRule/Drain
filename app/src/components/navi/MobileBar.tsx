import { type Dispatch, type SetStateAction } from 'react';
import { useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';

import Hamburger from 'lucide-react/icons/hamburger';

const MobileBar = observer(function MobileBar({ setIsNavboxOpen }: { setIsNavboxOpen: Dispatch<SetStateAction<boolean>> }) {
    const navigate = useNavigate();

    return (
        <div className='w-full flex md:hidden justify-between items-center py-5 px-12 z-30'>
            <div className='flex justify-center gap-3 cursor-pointer items-center mb-2 select-none' onClick={() => navigate('/')}>
                <h1 className='text-3xl font-bold text-primary drop-shadow-md'>drain!</h1>
            </div>

            <Hamburger className='w-8 h-8 cursor-pointer text-accent-foreground' onClick={() => setIsNavboxOpen(o => !o)} />
        </div>
    )
});

export default MobileBar;