interface LoaderProps {
    title: string
}

const Loader = ({ title }:LoaderProps) => {
  return (
    <div className="loading-container">
      <div className="spinner-text">{title}</div>
      <div className="destiny-loader">
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
      </div>
    </div>
  );
};

export default Loader;
