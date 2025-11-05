import icon from '@/assets/leak.jpeg';

export default function Loading() {
    return (
        <div className='flex justify-center items-center gap-10 h-screen w-screen'>
            <img src={icon} className='w-50 h-50' />
            <h1 className='text-7xl font-bold mb-1.5'>drain</h1>
        </div>
    )
}